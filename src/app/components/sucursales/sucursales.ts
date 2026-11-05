import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { Sucursal } from '../../models/sucursal';
import { SucursalesService } from '../../services/sucursales.service';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [],
  templateUrl: './sucursales.html',
  styleUrl: './sucursales.css',
})
export class SucursalesComponent implements OnInit {
  private sucursalesService = inject(SucursalesService);
  private detector = inject(ChangeDetectorRef);

  suc: Sucursal[] = [];

  ngOnInit(): void {
    this.sucursalesService.obtenerSucursales().subscribe({
      next: (sucursales) => {
        this.suc = sucursales;
        this.detector.markForCheck();
      },
      error: (error) => {
        console.error('No se pudieron cargar las sucursales', error);
      },
    });
  }
}
