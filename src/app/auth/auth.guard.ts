import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.cargarSesion().pipe(map(sesion => sesion.usuario !== '' || router.createUrlTree(['/login'])));
};

// También comprobamos la categoría si se escribe /Jefe directamente.
export const superiorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.cargarSesion().pipe(map(({ usuario }) => {
    if (usuario === '') return router.createUrlTree(['/login']);
    return usuario === '10' || usuario === '11' || router.createUrlTree(['/']);
  }));
};
