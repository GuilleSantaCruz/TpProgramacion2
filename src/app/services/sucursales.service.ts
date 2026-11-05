import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal } from '../models/sucursal';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SucursalesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  crearSucursal(sucursal: Omit<Sucursal, 'idSucursal'>): Observable<Sucursal> {
    return this.http.post<Sucursal>('/facturacion.php?accion=crearSucursal', sucursal, {
      headers: this.auth.cabecerasSesion
    });
  }

  borrarSucursal(id: number): Observable<{ mensaje: string; id: number }> {
    return this.http.post<{ mensaje: string; id: number }>('/facturacion.php?accion=borrarSucursal', { id }, {
      headers: this.auth.cabecerasSesion
    });
  }

  obtenerSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>('/facturacion.php');
  }
}
