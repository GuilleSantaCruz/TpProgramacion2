import { Routes } from '@angular/router';

import { HeaderComponent } from './components/header/header';
import { InicioComponent } from './components/inicio/inicio';
import { SucursalesComponent } from './components/sucursales/sucursales';
import { ClientesComponent } from './components/clientes/clientes';
import { VentasComponent } from './components/ventas/ventas';

export const routes: Routes = [
  { path: '', component: InicioComponent },

  { path: 'sucursales', component: SucursalesComponent },

  { path: 'clientes', component: ClientesComponent },

  { path: 'ventas', component: VentasComponent },

  { path: 'header', component: HeaderComponent },

  { path: '**', redirectTo: '' }
];
