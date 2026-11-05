import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard, superiorGuard } from './auth.guard';
import { ClientesComponent } from '../components/clientes/clientes';

const cliente = { idCliente: 44, nombre: 'Ana', apellido: 'Prueba', dni: 12345678, situacionFiscal: 'Consumidor Final' };

describe('Sesión PHP y alta de clientes', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  function login(usuario: string) {
    auth.login({ userName: usuario, password: 'ejemplo' }).subscribe();
    http.expectOne('/facturacion.php?accion=login').flush({ usuario, csrf: 'token-prueba' });
  }

  it('solo inicia sesión cuando PHP confirma y conserva el usuario cero', () => {
    auth.login({ userName: '0', password: 'ejemplo' }).subscribe();
    expect(auth.usuarioActual).toBe('');
    http.expectOne('/facturacion.php?accion=login').flush({ usuario: '0', csrf: 'token' });
    expect(auth.usuarioActual).toBe('0');
    expect(auth.puedeCrearClientes).toBe(false);
  });

  it('restaura una sesión al navegar y comprueba la categoría en Jefe', async () => {
    const resultado = TestBed.runInInjectionContext(() => superiorGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    const promesa = firstValueFrom(resultado as Observable<unknown>);
    http.expectOne('/facturacion.php?accion=sesion').flush({ usuario: '10', csrf: 'token' });
    expect(await promesa).toBe(true);
    expect(auth.puedeCrearClientes).toBe(true);
  });

  it('redirige a login cuando no hay sesión en PHP', async () => {
    const resultado = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    const promesa = firstValueFrom(resultado as Observable<unknown>);
    http.expectOne('/facturacion.php?accion=sesion').flush({ usuario: '', csrf: '' });
    expect(String(await promesa)).toBe('/login');
  });

  it('cierra la sesión en PHP antes de limpiar la interfaz', () => {
    login('11');
    auth.logout();
    const peticion = http.expectOne('/facturacion.php?accion=logout');
    expect(peticion.request.headers.get('X-CSRF-Token')).toBe('token-prueba');
    expect(auth.usuarioActual).toBe('11');
    peticion.flush({ mensaje: 'Sesión cerrada' });
    expect(auth.usuarioActual).toBe('');
  });

  it('oculta el formulario al usuario normal', () => {
    login('0');
    const fixture = TestBed.createComponent(ClientesComponent);
    fixture.detectChanges();
    http.expectOne('/facturacion.php?accion=clientes').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  for (const usuario of ['10', '11']) {
    it(`guarda como ${usuario}, impide doble envío y actualiza la lista solo después de confirmar`, () => {
      login(usuario);
      const fixture = TestBed.createComponent(ClientesComponent);
      fixture.detectChanges();
      http.expectOne('/facturacion.php?accion=clientes').flush([]);
      const component = fixture.componentInstance;
      component.form.setValue({ nombre: ' Ana ', apellido: 'Prueba', dni: '12345678', situacionFiscal: 'Consumidor Final' });
      component.crearCliente();
      component.crearCliente();
      expect(component.clients).toEqual([]);
      const peticion = http.expectOne('/facturacion.php?accion=crearCliente');
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body.nombre).toBe('Ana');
      expect(peticion.request.headers.get('X-CSRF-Token')).toBe('token-prueba');
      peticion.flush(cliente, { status: 201, statusText: 'Created' });
      expect(component.clients).toEqual([cliente]);
      expect(component.guardando).toBe(false);
      expect(component.mensaje).toContain('guardado');
    });
  }

  it('conserva el formulario y no inventa un cliente cuando PHP rechaza el guardado', () => {
    login('10');
    const fixture = TestBed.createComponent(ClientesComponent);
    fixture.detectChanges();
    http.expectOne('/facturacion.php?accion=clientes').flush([]);
    const component = fixture.componentInstance;
    component.form.setValue({ nombre: 'Ana', apellido: 'Prueba', dni: '12345678', situacionFiscal: 'Consumidor Final' });
    component.crearCliente();
    http.expectOne('/facturacion.php?accion=crearCliente').flush({ error: 'No tenés permiso' }, { status: 403, statusText: 'Forbidden' });
    expect(component.clients).toEqual([]);
    expect(component.form.controls.nombre.value).toBe('Ana');
    expect(component.error).toBe('No tenés permiso');
    expect(component.mensaje).toBe('');
  });
});
