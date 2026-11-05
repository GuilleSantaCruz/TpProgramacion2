import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal } from '../models/sucursal';

@Injectable({
  providedIn: 'root'
})
export class SucursalesService {
  private http = inject(HttpClient);

  obtenerSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>('/facturacion.php');
  }
}
