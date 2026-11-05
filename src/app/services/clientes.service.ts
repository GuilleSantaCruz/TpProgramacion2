import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cliente } from '../models/cliente';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  borrarCliente(id: number): Observable<{ mensaje: string; id: number }> {
    return this.http.post<{ mensaje: string; id: number }>('/facturacion.php?accion=borrarCliente', { id }, {
      headers: this.auth.cabecerasSesion
    });
  }

  crearCliente(cliente: Omit<Cliente, 'idCliente'>): Observable<Cliente> {
    return this.http.post<Cliente>('/facturacion.php?accion=crearCliente', cliente, {
      headers: this.auth.cabecerasSesion
    });
  }

  obtenerClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(
      '/facturacion.php?accion=clientes'
    );
  }
}
