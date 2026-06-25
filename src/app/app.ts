import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { InicioComponent } from './components/inicio/inicio';
import { SucursalesComponent } from './components/sucursales/sucursales';
import { ClientesComponent } from './components/clientes/clientes';
import { VentasComponent } from './components/ventas/ventas';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, InicioComponent, SucursalesComponent, ClientesComponent, VentasComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Trabajo-Practico');
}
