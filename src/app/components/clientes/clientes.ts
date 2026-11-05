import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';

import { Cliente } from '../../models/cliente';
import { ClientesService } from '../../services/clientes.service';
import { AuthService } from '../../auth/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-clientes',
  imports: [ReactiveFormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class ClientesComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private detector = inject(ChangeDetectorRef);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);
  guardando = false;
  borrando = false;
  clienteABorrar: Cliente | null = null;
  cargando = false;
  mensaje = '';
  error = '';
  situaciones = ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final', 'No Categorizado'];
  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/\S/)]],
    apellido: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/\S/)]],
    dni: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{0,7}$/)]],
    situacionFiscal: ['Consumidor Final', Validators.required]
  });

  crearCliente(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.guardando || this.borrando || this.cargando || !this.auth.puedeCrearClientes) return;
    this.guardando = true;
    this.mensaje = '';
    this.error = '';
    const valores = this.form.getRawValue();
    this.clientesService.crearCliente({
      ...valores, nombre: valores.nombre.trim(), apellido: valores.apellido.trim(), dni: Number(valores.dni)
    }).subscribe({
      next: cliente => {
        this.clients = [...this.clients, cliente];
        this.mensaje = `Cliente ${cliente.nombre} ${cliente.apellido} guardado en la base de datos (ID ${cliente.idCliente}).`;
        this.form.reset();
        this.guardando = false;
        this.detector.markForCheck();
      },
      error: error => {
        this.error = error.error?.error ?? 'No se pudo guardar el cliente. Intentá nuevamente.';
        this.guardando = false;
        this.detector.markForCheck();
      }
    });
  }

  clients: Cliente[] = [];

  solicitarBorrado(cliente: Cliente): void {
    if (this.guardando || this.borrando || !this.auth.puedeBorrarClientes) return;
    this.clienteABorrar = cliente;
    this.error = '';
    this.mensaje = '';
  }

  borrarCliente(): void {
    const cliente = this.clienteABorrar;
    if (!cliente || this.borrando || this.guardando || !this.auth.puedeBorrarClientes) return;
    this.borrando = true;
    this.error = '';
    this.clientesService.borrarCliente(cliente.idCliente).subscribe({
      next: () => {
        this.clients = this.clients.filter(item => item.idCliente !== cliente.idCliente);
        this.clienteABorrar = null;
        this.borrando = false;
        this.mensaje = `Cliente ${cliente.nombre} ${cliente.apellido} eliminado de la base de datos.`;
        this.detector.markForCheck();
      },
      error: error => {
        this.error = error.error?.error ?? 'No se pudo borrar el cliente. Intentá nuevamente.';
        this.borrando = false;
        this.detector.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.cargando = true;
    this.clientesService.obtenerClientes().subscribe({
      next: (clientes) => {
        this.clients = clientes;
        this.cargando = false;
        this.detector.markForCheck();
      },
      error: (error) => {
        console.error('No se pudieron cargar los clientes', error);
        this.cargando = false;
        this.error = 'No se pudieron cargar los clientes. Recargá la página para intentar nuevamente.';
        this.detector.markForCheck();
      },
    });
  }
}
