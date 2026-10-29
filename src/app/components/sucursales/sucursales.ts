import { Component, inject, OnInit } from '@angular/core';
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

  suc: Sucursal[] = [];

  ngOnInit(): void {
    this.suc = this.suc = this.sucursalesService.obtenerSucursales();
  }
}
