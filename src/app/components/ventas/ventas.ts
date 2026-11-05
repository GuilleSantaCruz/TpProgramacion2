import { Component, inject, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { VentasService } from '../../services/ventas.service';
import { RespuestaVentas } from '../../models/ventas';

type TipoGrafico = 'barras' | 'apiladas' | 'lineas';

@Component({
  selector: 'app-ventas',
  imports: [DecimalPipe],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class VentasComponent implements OnInit {
  private ventasService = inject(VentasService);
  private detector = inject(ChangeDetectorRef);
  private canvas?: HTMLCanvasElement;


  anio = 2025;
  respuesta: RespuestaVentas | null = null;
  cargando = false;
  error = '';
  tipoGrafico: TipoGrafico = 'barras';

  titulosGrafico = {
    barras: 'Ventas por mes y sucursal',
    apiladas: 'Total mensual y aporte de cada sucursal',
    lineas: 'Evolución mensual de las ventas',
  };

  meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  ngOnInit(): void {
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.cargando = true;
    this.error = '';
    this.respuesta = null;

    this.ventasService.obtenerVentas(this.anio).subscribe({
      next: (respuesta) => {
        this.respuesta = respuesta;
        this.cargando = false;
        this.detector.markForCheck();
      },
      error: (error) => {
        console.error('No se pudieron cargar las ventas', error);
        this.error = 'No se pudieron cargar las ventas.';
        this.cargando = false;
        this.detector.markForCheck();
      },
    });
  }

  cambiarAnio(valor: string): void {
    const nuevoAnio = Number(valor);

    if (!Number.isInteger(nuevoAnio) || nuevoAnio < 1000 || nuevoAnio > 9999) {
      return;
    }

    this.anio = nuevoAnio;
    this.cargarVentas();
  }

  cambiarGrafico(valor: string): void {
  if (valor === 'barras' || valor === 'apiladas' || valor === 'lineas') {
    this.tipoGrafico = valor;
    this.dibujarGrafico();
  }
}

// Armado del canvas

  @ViewChild('graficoVentas')
set graficoVentas(elemento: ElementRef<HTMLCanvasElement> | undefined) {
  this.canvas = elemento?.nativeElement;
  this.dibujarGrafico();
}
colores = ['#2563eb', '#e87924', '#16a34a', '#9333ea', '#dc2626'];

private dibujarGrafico(): void {
  const canvas = this.canvas;
  const respuesta = this.respuesta;

  if (!canvas || !respuesta) {
    return;
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sucursales = respuesta.sucursales;

  if (sucursales.length === 0) {
    ctx.font = '16px Arial';
    ctx.fillStyle = '#334155';
    ctx.fillText('No hay sucursales para graficar.', 40, 60);
    return;
  }

  // Matriz: una fila por mes y una columna por sucursal.
  const datos = this.meses.map((_, indiceMes) =>
    sucursales.map(sucursal =>
      respuesta.ventas[sucursal.idSucursal]?.[indiceMes + 1] ?? 0
    )
  );

  // En el apilado importa el total mensual.
  // En los otros dos, importa el mayor valor individual.
  const valoresParaEscala = this.tipoGrafico === 'apiladas'
    ? datos.map(fila => fila.reduce((suma, valor) => suma + valor, 0))
    : datos.flat();

  // Evita dividir por cero cuando todo el año está en cero.
  const maximo = Math.max(1, ...valoresParaEscala) * 1.1;

  const izquierda = 100;
  const derecha = canvas.width - 25;
  const arriba = 40;
  const abajo = canvas.height - 55;

  const ancho = derecha - izquierda;
  const alto = abajo - arriba;
  const espacioMes = ancho / 12;

  const posicionY = (valor: number) =>
    abajo - (valor / maximo) * alto;

  const formato = new Intl.NumberFormat('es-AR', {
    notation: 'compact',
    maximumFractionDigits: 1
  });

  // Escala y líneas horizontales.
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';

  for (let i = 0; i <= 5; i++) {
    const valor = maximo * i / 5;
    const y = posicionY(valor);

    ctx.beginPath();
    ctx.moveTo(izquierda, y);
    ctx.lineTo(derecha, y);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillText(formato.format(valor), izquierda - 12, y + 4);
  }

  // Ejes.
  ctx.beginPath();
  ctx.moveTo(izquierda, arriba);
  ctx.lineTo(izquierda, abajo);
  ctx.lineTo(derecha, abajo);
  ctx.strokeStyle = '#64748b';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.fillText('Importe', izquierda, 22);

  // Etiquetas de los meses.
  ctx.textAlign = 'center';

  this.meses.forEach((mes, indice) => {
    const x = izquierda + espacioMes * (indice + 0.5);
    ctx.fillText(mes.slice(0, 3), x, abajo + 25);
  });

  if (this.tipoGrafico === 'barras') {
    const anchoGrupo = espacioMes * 0.8;
    const anchoBarra = anchoGrupo / sucursales.length;

    datos.forEach((fila, mes) => {
      fila.forEach((valor, sucursal) => {
        const x = izquierda
          + mes * espacioMes
          + espacioMes * 0.1
          + sucursal * anchoBarra;

        const y = posicionY(valor);

        ctx.fillStyle = this.colores[sucursal % this.colores.length];

        ctx.fillRect(
          x,
          y,
          anchoBarra * 0.9,
          abajo - y
        );
      });
    });
  } else if (this.tipoGrafico === 'apiladas') {
    datos.forEach((fila, mes) => {
      let acumulado = 0;

      fila.forEach((valor, sucursal) => {
        const x = izquierda + mes * espacioMes + espacioMes * 0.2;
        const y = posicionY(acumulado + valor);
        const altura = valor / maximo * alto;

        ctx.fillStyle = this.colores[sucursal % this.colores.length];
        ctx.fillRect(x, y, espacioMes * 0.6, altura);

        acumulado += valor;
      });
    });
  } else {
    sucursales.forEach((_, sucursal) => {
      const color = this.colores[sucursal % this.colores.length];

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      datos.forEach((fila, mes) => {
        const x = izquierda + espacioMes * (mes + 0.5);
        const y = posicionY(fila[sucursal]);

        if (mes === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Puntos sobre las líneas.
      datos.forEach((fila, mes) => {
        const x = izquierda + espacioMes * (mes + 0.5);
        const y = posicionY(fila[sucursal]);

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    });
  }
}
}
