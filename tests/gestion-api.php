<?php
// Prueba de integración: solo modifica y elimina los registros que ella crea.
require __DIR__ . '/../backend/config/conexion.php';
$conn = conectar();
$cookie = tempnam(sys_get_temp_dir(), 'tp-gestion-');
$nombre = 'PruebaGestion-' . bin2hex(random_bytes(5));
$clienteId = null;
$sucursalId = null;
$facturaId = null;

function peticion(string $accion, ?array $datos = null, string $token = '', bool $get = false): array {
  global $cookie;
  $curl = curl_init('http://localhost:8011/facturacion.php?accion=' . $accion);
  curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_COOKIEFILE => $cookie,
    CURLOPT_COOKIEJAR => $cookie, CURLOPT_TIMEOUT => 10]);
  if ($datos !== null && !$get) {
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($datos),
      CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-CSRF-Token: ' . $token]]);
  }
  $respuesta = curl_exec($curl);
  if ($respuesta === false) throw new Exception(curl_error($curl));
  $estado = curl_getinfo($curl, CURLINFO_HTTP_CODE);
  curl_close($curl);
  return [$estado, json_decode($respuesta, true, 512, JSON_THROW_ON_ERROR)];
}
function verificar(bool $condicion, string $mensaje): void {
  if (!$condicion) throw new Exception($mensaje);
  echo "OK: $mensaje\n";
}
function ingresar(string $usuario): string {
  [$estado, $sesion] = peticion('login', ['userName' => $usuario, 'password' => 'prueba']);
  if ($estado !== 200) throw new Exception('Falló el login de prueba');
  return $sesion['csrf'];
}

try {
  $sucursal = ['nombre' => $nombre, 'ciudad' => 'Santa Fe', 'direccion' => 'Calle de prueba', 'cantempleado' => 0];
  foreach (['crearSucursal', 'borrarSucursal', 'borrarCliente'] as $accion) {
    verificar(peticion($accion, ['id' => -1])[0] === 401, "$accion rechaza falta de sesión");
  }
  $token = ingresar('0');
  foreach (['crearSucursal', 'borrarSucursal', 'borrarCliente'] as $accion) {
    verificar(peticion($accion, ['id' => -1], $token)[0] === 403, "$accion rechaza usuario normal");
  }
  $token = ingresar('10');
  verificar(peticion('crearSucursal', $sucursal, $token)[0] === 403, 'Administrador no crea sucursales');
  verificar(peticion('borrarSucursal', ['id' => -1], $token)[0] === 403, 'Administrador no borra sucursales');
  [$estado, $cliente] = peticion('crearCliente', ['nombre' => $nombre, 'apellido' => 'Temporal', 'dni' => 12345678, 'situacionFiscal' => 'Consumidor Final'], $token);
  $clienteId = $cliente['idCliente'] ?? null;
  verificar($estado === 201 && $clienteId !== null, 'Cliente de prueba creado');

  $token = ingresar('11');
  verificar(peticion('crearSucursal', $sucursal)[0] === 403, 'Alta requiere token');
  verificar(peticion('crearSucursal', array_merge($sucursal, ['nombre' => ' ']), $token)[0] === 422, 'Nombre vacío rechazado');
  verificar(peticion('crearSucursal', array_merge($sucursal, ['direccion' => str_repeat('a', 51)]), $token)[0] === 422, 'Longitud inválida rechazada');
  foreach ([-1, 1.5] as $empleados) {
    verificar(peticion('crearSucursal', array_merge($sucursal, ['cantempleado' => $empleados]), $token)[0] === 422, 'Empleados inválidos rechazados');
  }
  [$estado, $nueva] = peticion('crearSucursal', $sucursal, $token);
  $sucursalId = $nueva['idSucursal'] ?? null;
  verificar($estado === 201 && $sucursalId !== null, 'Superusuario crea sucursal con cero empleados');
  [, $lista] = peticion('sucursales');
  verificar(count(array_filter($lista, fn($fila) => $fila['idSucursal'] === $sucursalId && $fila['nombre'] === $nombre)) === 1, 'Sucursal persistida en nueva consulta');
  [, $ventas] = peticion('ventas&anio=2025');
  verificar(count($ventas['ventas'][$sucursalId]) === 12 && array_sum($ventas['ventas'][$sucursalId]) === 0, 'Nueva sucursal tiene doce meses en cero');

  // Factura temporal para comprobar la protección sin usar registros del usuario.
  $stmt = $conn->prepare("INSERT INTO facturas (FechaFactura, IdCliente, Importe, IVA, Estado, idSucursal) VALUES ('2025-01-01', ?, 0, 0, 'Pendiente', ?)");
  $stmt->bind_param('ii', $clienteId, $sucursalId);
  $stmt->execute();
  $facturaId = $conn->insert_id;
  $stmt->close();
  verificar(peticion('borrarSucursal', ['id' => $sucursalId], $token)[0] === 409, 'Sucursal con factura no se elimina');
  verificar(peticion('borrarCliente', ['id' => $clienteId], $token)[0] === 409, 'Cliente con factura no se elimina');
  verificar(peticion('borrarSucursal', ['id' => -1], $token)[0] === 422, 'ID inválido rechazado');
  verificar(peticion('borrarSucursal', ['id' => $sucursalId])[0] === 403, 'Borrado requiere token');
  verificar(peticion('borrarSucursal')[0] === 405, 'GET no elimina');
  $stmt = $conn->prepare('DELETE FROM facturas WHERE NroFactura = ? AND IdCliente = ? AND idSucursal = ?');
  $stmt->bind_param('iii', $facturaId, $clienteId, $sucursalId);
  $stmt->execute();
  $stmt->close();
  $facturaId = null;

  verificar(peticion('borrarSucursal', ['id' => $sucursalId], $token)[0] === 200, 'Sucursal sin facturas eliminada');
  verificar(peticion('borrarSucursal', ['id' => $sucursalId], $token)[0] === 404, 'Segundo borrado devuelve inexistente');
  [, $lista] = peticion('sucursales');
  verificar(count(array_filter($lista, fn($fila) => $fila['idSucursal'] === $sucursalId)) === 0, 'Sucursal eliminada no reaparece');
  $token = ingresar('10');
  verificar(peticion('borrarCliente', ['id' => $clienteId], $token)[0] === 200, 'Administrador borra cliente sin facturas');
  verificar(peticion('borrarCliente', ['id' => $clienteId], $token)[0] === 404, 'Cliente eliminado devuelve inexistente');
  [, $lista] = peticion('clientes');
  verificar(count(array_filter($lista, fn($fila) => $fila['idCliente'] === $clienteId)) === 0, 'Cliente eliminado no reaparece');
} finally {
  if ($facturaId !== null) {
    $stmt = $conn->prepare('DELETE FROM facturas WHERE NroFactura = ? AND IdCliente = ? AND idSucursal = ?');
    $stmt->bind_param('iii', $facturaId, $clienteId, $sucursalId);
    $stmt->execute();
    $stmt->close();
  }
  foreach ([['cliente', 'idCliente', $clienteId], ['sucursal', 'idSucursal', $sucursalId]] as [$tabla, $clave, $id]) {
    if ($id === null) continue;
    $stmt = $conn->prepare("DELETE FROM $tabla WHERE $clave = ? AND nombre = ?");
    $stmt->bind_param('is', $id, $nombre);
    $stmt->execute();
    $stmt->close();
  }
  $conn->close();
  unlink($cookie);
}
