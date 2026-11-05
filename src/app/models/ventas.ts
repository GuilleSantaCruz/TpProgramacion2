import { Sucursal } from './sucursal';

export interface RespuestaVentas {
  anio: number;
  sucursales: Sucursal[];
  ventas: Record<string, Record<string, number>>;
}
