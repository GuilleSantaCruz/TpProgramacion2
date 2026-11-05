import { Component, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-jefe',
  template: `
    <section style="padding: 32px; font-family: Arial, sans-serif">
      <h1>{{ auth.categoria(auth.usuarioActual) }}</h1>
      <p>Solo para autorizados: esta pantalla demuestra el acceso de las categorías 10 y 11.</p>
      <p>Es una simulación de clase; todavía no hay operaciones de administración.</p>
    </section>
  `
})
export class JefeComponent {
  protected auth = inject(AuthService);
}
