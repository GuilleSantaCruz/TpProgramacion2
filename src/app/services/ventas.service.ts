import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RespuestaVentas } from '../models/ventas';

@Injectable({
  providedIn: 'root',
})
export class VentasService {
  private http = inject(HttpClient);

  obtenerVentas(anio: number): Observable<RespuestaVentas> {
    return this.http.get<RespuestaVentas>('/facturacion.php', {
      params: {
        accion: 'ventas',
        anio: anio.toString(),
      },
    });
  }
}
