import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { Sucursal } from '../../models/sucursal';
import { SucursalesService } from '../../services/sucursales.service';
import { AuthService } from '../../auth/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './sucursales.html',
  styleUrl: './sucursales.css',
})
export class SucursalesComponent implements OnInit {
  private sucursalesService = inject(SucursalesService);
  private detector = inject(ChangeDetectorRef);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);
  cargando = false;
  guardando = false;
  borrando = false;
  sucursalABorrar: Sucursal | null = null;
  mensaje = '';
  error = '';
  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/\S/)]],
    ciudad: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/\S/)]],
    direccion: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/\S/)]],
    cantempleado: [0, [Validators.required, Validators.min(0), Validators.max(2147483647), Validators.pattern(/^\d+$/)]]
  });

  suc: Sucursal[] = [];

  crearSucursal(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.guardando || this.borrando || this.cargando || !this.auth.puedeGestionarSucursales) return;
    this.guardando = true;
    this.mensaje = '';
    this.error = '';
    const valores = this.form.getRawValue();
    this.sucursalesService.crearSucursal({ ...valores,
      nombre: valores.nombre.trim(), ciudad: valores.ciudad.trim(), direccion: valores.direccion.trim()
    }).subscribe({
      next: sucursal => {
        this.suc = [...this.suc, sucursal];
        this.form.reset();
        this.guardando = false;
        this.mensaje = `Sucursal ${sucursal.nombre} guardada en la base de datos (ID ${sucursal.idSucursal}).`;
        this.detector.markForCheck();
      },
      error: error => {
        this.error = error.error?.error ?? 'No se pudo guardar la sucursal. Intentá nuevamente.';
        this.guardando = false;
        this.detector.markForCheck();
      }
    });
  }

  solicitarBorrado(sucursal: Sucursal): void {
    if (this.guardando || this.borrando || !this.auth.puedeGestionarSucursales) return;
    this.sucursalABorrar = sucursal;
    this.error = '';
    this.mensaje = '';
  }

  borrarSucursal(): void {
    const sucursal = this.sucursalABorrar;
    if (!sucursal || this.borrando || this.guardando || !this.auth.puedeGestionarSucursales) return;
    this.borrando = true;
    this.error = '';
    this.sucursalesService.borrarSucursal(sucursal.idSucursal).subscribe({
      next: () => {
        this.suc = this.suc.filter(item => item.idSucursal !== sucursal.idSucursal);
        this.sucursalABorrar = null;
        this.borrando = false;
        this.mensaje = `Sucursal ${sucursal.nombre} eliminada de la base de datos.`;
        this.detector.markForCheck();
      },
      error: error => {
        this.error = error.error?.error ?? 'No se pudo borrar la sucursal. Intentá nuevamente.';
        this.borrando = false;
        this.detector.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.cargando = true;
    this.sucursalesService.obtenerSucursales().subscribe({
      next: (sucursales) => {
        this.suc = sucursales;
        this.cargando = false;
        this.detector.markForCheck();
      },
      error: (error) => {
        console.error('No se pudieron cargar las sucursales', error);
        this.cargando = false;
        this.error = 'No se pudieron cargar las sucursales. Recargá la página para intentar nuevamente.';
        this.detector.markForCheck();
      },
    });
  }
}
