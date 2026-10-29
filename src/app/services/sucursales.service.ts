import { Injectable } from '@angular/core';
import { Sucursal } from '../models/sucursal';

@Injectable({
  providedIn: 'root'
})
export class SucursalesService {
  obtenerSucursales(): Sucursal[] {
    return [
      { id: 'Santa Fe', nEmp: 20, dir: 'San Martin 1111' },
      { id: 'Rosario', nEmp: 15, dir: 'Rioja 2222' },
      { id: 'Paraná', nEmp: 10, dir: 'San Jerónimo 3333' },
      { id: 'Chajarí', nEmp: 30, dir: '9 de julio 4444' },
      { id: 'Concordia', nEmp: 5, dir: 'Costanera 5555' }
    ];
  }
}
