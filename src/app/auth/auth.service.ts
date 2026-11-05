import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { User } from './user';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

interface Sesion { usuario: string; csrf: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private csrf = '';
  errorLogout = new BehaviorSubject<string>('');
  private loggedIn = new BehaviorSubject<string>('');
  readonly isLoggedIn = this.loggedIn.asObservable();

  get usuarioActual(): string {
    return this.loggedIn.value;
  }

  get puedeCrearClientes(): boolean {
    return ['10', '11'].includes(this.usuarioActual);
  }

  get puedeBorrarClientes(): boolean {
    return ['10', '11'].includes(this.usuarioActual);
  }

  get puedeGestionarSucursales(): boolean {
    return this.usuarioActual === '11';
  }

  get cabecerasSesion() { return { 'X-CSRF-Token': this.csrf }; }

  private actualizar(sesion: Sesion): void {
    this.loggedIn.next(sesion.usuario);
    this.csrf = sesion.csrf;
  }

  // Sigue siendo simulado, pero PHP conserva y comprueba la categoría.
  login(user: User) {
    return this.http.post<Sesion>('/facturacion.php?accion=login', user).pipe(
      tap(sesion => this.actualizar(sesion))
    );
  }

  cargarSesion() {
    return this.http.get<Sesion>('/facturacion.php?accion=sesion').pipe(
      catchError(() => of({ usuario: '', csrf: '' })),
      tap(sesion => this.actualizar(sesion))
    );
  }

  logout(): void {
    this.errorLogout.next('');
    this.http.post('/facturacion.php?accion=logout', {}, { headers: this.cabecerasSesion }).subscribe({
      next: () => {
        this.actualizar({ usuario: '', csrf: '' });
        void this.router.navigate(['/login']);
      },
      error: () => this.errorLogout.next('No se pudo cerrar sesión. Recargá la página y volvé a intentar.')
    });
  }

  categoria(usuario: string): string {
    if (usuario === '10') return 'Administrador';
    if (usuario === '11') return 'Superusuario';
    return 'Usuario normal';
  }
}
