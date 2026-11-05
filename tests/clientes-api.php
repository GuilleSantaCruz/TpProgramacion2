<?php
// Ejecutar con el servidor de prueba en localhost:8011 y MySQL encendido.
// Los únicos registros eliminados al finalizar son los creados por esta prueba.
require __DIR__ . '/../backend/config/conexion.php';
$conn = conectar();
$ids = [];
$cookie = tempnam(sys_get_temp_dir(), 'tp-sesion-');
$nombre = 'PruebaAPI-' . bin2hex(random_bytes(6));

function pedir(string $accion, ?array $datos = null, string $token = ''): array {
  global $cookie;
  $curl = curl_init('http://localhost:8011/facturacion.php?accion=' . $accion);
  curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_COOKIEFILE => $cookie,
    CURLOPT_COOKIEJAR => $cookie, CURLOPT_TIMEOUT => 10]);
  if ($datos !== null) {
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($datos),
      CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-CSRF-Token: ' . $token]]);
  }
  $respuesta = curl_exec($curl);
  if ($respuesta === false) throw new Exception(curl_error($curl));
  $estado = curl_getinfo($curl, CURLINFO_HTTP_CODE);
  curl_close($curl);
  return [$estado, json_decode($respuesta, true, 512, JSON_THROW_ON_ERROR)];
}
function comprobar(bool $condicion, string $mensaje): void {
  if (!$condicion) throw new Exception($mensaje);
  echo "OK: $mensaje\n";
}

try {
  $cliente = ['nombre' => $nombre, 'apellido' => 'Temporal', 'dni' => 12345678, 'situacionFiscal' => 'Consumidor Final'];
  comprobar(pedir('crearCliente', $cliente)[0] === 401, 'Sin sesión no se puede crear');
  comprobar(pedir('login', ['userName' => '12', 'password' => 'prueba'])[0] === 422, 'Categoría inválida rechazada');
  [, $sesion] = pedir('login', ['userName' => '0', 'password' => 'prueba']);
  comprobar(pedir('clientes')[0] === 200, 'Usuario cero puede consultar');
  comprobar(pedir('crearCliente', $cliente, $sesion['csrf'])[0] === 403, 'Usuario normal no puede crear');

  foreach (['10', '11'] as $usuario) {
    [, $sesion] = pedir('login', ['userName' => $usuario, 'password' => 'prueba']);
    comprobar(pedir('sesion')[1]['usuario'] === $usuario, "Sesión $usuario conservada entre peticiones");
    comprobar(pedir('crearCliente', $cliente)[0] === 403, 'Token ausente rechazado');
    comprobar(pedir('crearCliente', array_merge($cliente, ['nombre' => ' ']), $sesion['csrf'])[0] === 422, 'Nombre vacío rechazado');
    comprobar(pedir('crearCliente', array_merge($cliente, ['dni' => -1]), $sesion['csrf'])[0] === 422, 'DNI inválido rechazado');
    comprobar(pedir('crearCliente', array_merge($cliente, ['situacionFiscal' => 'Inventado']), $sesion['csrf'])[0] === 422, 'Situación fiscal inválida rechazada');
    [$estado, $nuevo] = pedir('crearCliente', $cliente, $sesion['csrf']);
    if (isset($nuevo['idCliente'])) $ids[] = $nuevo['idCliente'];
    comprobar($estado === 201 && isset($nuevo['idCliente']), "Categoría $usuario guarda en MySQL");
    [, $lista] = pedir('clientes');
    $encontrados = array_values(array_filter($lista, fn($fila) => $fila['idCliente'] === $nuevo['idCliente']));
    comprobar(count($encontrados) === 1 && $encontrados[0]['nombre'] === $nombre, 'Nueva consulta devuelve el cliente persistido');
    comprobar(pedir('logout', [], $sesion['csrf'])[0] === 200, 'Logout confirmado');
    comprobar(pedir('clientes')[0] === 401, 'Sesión cerrada no accede a los datos');
  }
} finally {
  foreach ($ids as $id) {
    $borrar = $conn->prepare('DELETE FROM cliente WHERE idCliente = ? AND nombre = ?');
    $borrar->bind_param('is', $id, $nombre);
    $borrar->execute();
    $borrar->close();
  }
  $conn->close();
  unlink($cookie);
}
