import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { ClientesComponent } from '../components/clientes/clientes';
import { SucursalesComponent } from '../components/sucursales/sucursales';

const cliente = { idCliente: 40, nombre: 'Ana', apellido: 'Prueba', dni: 12345678, situacionFiscal: 'Consumidor Final' };
const sucursal = { idSucursal: 60, nombre: 'Prueba', ciudad: 'Santa Fe', direccion: 'Calle 123', cantempleado: 0 };

describe('Altas y bajas con permisos', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function login(usuario: string) {
    TestBed.inject(AuthService).login({ userName: usuario, password: 'prueba' }).subscribe();
    http.expectOne('/facturacion.php?accion=login').flush({ usuario, csrf: 'token' });
  }
  function prepararClientes() {
    const fixture = TestBed.createComponent(ClientesComponent);
    fixture.detectChanges();
    http.expectOne('/facturacion.php?accion=clientes').flush([cliente]);
    fixture.detectChanges();
    return fixture;
  }
  function prepararSucursales() {
    const fixture = TestBed.createComponent(SucursalesComponent);
    fixture.detectChanges();
    http.expectOne('/facturacion.php').flush([sucursal]);
    fixture.detectChanges();
    return fixture;
  }

  for (const usuario of ['0', '10']) {
    it(`no muestra alta ni borrado de sucursales a ${usuario}`, () => {
      login(usuario);
      const fixture = prepararSucursales();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      expect(fixture.nativeElement.querySelector('button')).toBeNull();
      fixture.componentInstance.solicitarBorrado(sucursal);
      expect(fixture.componentInstance.sucursalABorrar).toBeNull();
    });
  }

  it('no muestra borrado de clientes al usuario normal', () => {
    login('0');
    const fixture = prepararClientes();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('cancelar la confirmación no envía ninguna petición', () => {
    login('10');
    const fixture = prepararClientes();
    fixture.nativeElement.querySelector('td button').click();
    fixture.detectChanges();
    const botones = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    botones.find(boton => boton.textContent?.trim() === 'Cancelar')!.click();
    expect(fixture.componentInstance.clienteABorrar).toBeNull();
    http.expectNone('/facturacion.php?accion=borrarCliente');
  });

  for (const usuario of ['10', '11']) {
    it(`borra el cliente como ${usuario} solo tras confirmar el servidor`, () => {
      login(usuario);
      const component = prepararClientes().componentInstance;
      component.solicitarBorrado(cliente);
      http.expectNone('/facturacion.php?accion=borrarCliente');
      component.borrarCliente();
      component.borrarCliente();
      const peticion = http.expectOne('/facturacion.php?accion=borrarCliente');
      expect(peticion.request.body).toEqual({ id: 40 });
      expect(peticion.request.headers.get('X-CSRF-Token')).toBe('token');
      expect(component.clients).toEqual([cliente]);
      peticion.flush({ id: 40, mensaje: 'Eliminado' });
      expect(component.clients).toEqual([]);
      expect(component.clienteABorrar).toBeNull();
    });
  }

  it('conserva el cliente si tiene facturas', () => {
    login('10');
    const component = prepararClientes().componentInstance;
    component.solicitarBorrado(cliente);
    component.borrarCliente();
    http.expectOne('/facturacion.php?accion=borrarCliente').flush({ error: 'Tiene facturas asociadas' }, { status: 409, statusText: 'Conflict' });
    expect(component.clients).toEqual([cliente]);
    expect(component.error).toContain('facturas');
    expect(component.borrando).toBe(false);
  });

  it('crea sucursal con cero empleados y bloquea doble envío', () => {
    login('11');
    const component = prepararSucursales().componentInstance;
    component.form.setValue({ nombre: 'Nueva', ciudad: 'Santa Fe', direccion: 'Calle 456', cantempleado: 0 });
    component.crearSucursal();
    component.crearSucursal();
    const peticion = http.expectOne('/facturacion.php?accion=crearSucursal');
    expect(peticion.request.body.cantempleado).toBe(0);
    expect(component.suc.length).toBe(1);
    peticion.flush({ ...sucursal, idSucursal: 61, nombre: 'Nueva' }, { status: 201, statusText: 'Created' });
    expect(component.suc.length).toBe(2);
  });

  it('rechaza empleados negativos y conserva datos si falla el alta', () => {
    login('11');
    const component = prepararSucursales().componentInstance;
    component.form.setValue({ nombre: 'Nueva', ciudad: 'Santa Fe', direccion: 'Calle 456', cantempleado: -1 });
    component.crearSucursal();
    http.expectNone('/facturacion.php?accion=crearSucursal');
    component.form.controls.cantempleado.setValue(2);
    component.crearSucursal();
    http.expectOne('/facturacion.php?accion=crearSucursal').flush({ error: 'Sin conexión' }, { status: 503, statusText: 'Unavailable' });
    expect(component.suc.length).toBe(1);
    expect(component.form.controls.nombre.value).toBe('Nueva');
    expect(component.mensaje).toBe('');
  });

  it('conserva sucursal vinculada y elimina una sin facturas tras confirmar', () => {
    login('11');
    const component = prepararSucursales().componentInstance;
    component.solicitarBorrado(sucursal);
    component.borrarSucursal();
    http.expectOne('/facturacion.php?accion=borrarSucursal').flush({ error: 'Tiene facturas' }, { status: 409, statusText: 'Conflict' });
    expect(component.suc).toEqual([sucursal]);
    component.borrarSucursal();
    http.expectOne('/facturacion.php?accion=borrarSucursal').flush({ id: 60, mensaje: 'Eliminado' });
    expect(component.suc).toEqual([]);
    expect(component.borrando).toBe(false);
  });
});
