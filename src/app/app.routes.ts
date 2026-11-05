import { Routes } from '@angular/router';

import { LoginComponent } from './components/login/login';
import { JefeComponent } from './components/jefe/jefe';
import { authGuard, superiorGuard } from './auth/auth.guard';
import { InicioComponent } from './components/inicio/inicio';
import { SucursalesComponent } from './components/sucursales/sucursales';
import { ClientesComponent } from './components/clientes/clientes';
import { VentasComponent } from './components/ventas/ventas';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: InicioComponent, canActivate: [authGuard] },

  { path: 'sucursales', component: SucursalesComponent, canActivate: [authGuard] },

  { path: 'clientes', component: ClientesComponent, canActivate: [authGuard] },

  { path: 'ventas', component: VentasComponent, canActivate: [authGuard] },

  { path: 'Jefe', component: JefeComponent, canActivate: [superiorGuard] },

  { path: '**', redirectTo: '' }
];
