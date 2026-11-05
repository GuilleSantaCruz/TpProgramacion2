<?php

require_once __DIR__ . '/config/conexion.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => '/']);
session_start();

function responder(array $datos, int $estado = 200): never
{
  http_response_code($estado);
  echo json_encode($datos, JSON_UNESCAPED_UNICODE);
  exit;
}

function leerJson(): array
{
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(['error' => 'Se requiere POST'], 405);
  if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    responder(['error' => 'Se requiere JSON'], 415);
  }
  $datos = json_decode(file_get_contents('php://input'), true);
  if (!is_array($datos)) responder(['error' => 'JSON inválido'], 400);
  return $datos;
}

function verificarToken(): void
{
  if (!isset($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
    responder(['error' => 'La sesión cambió. Recargá la página e intentá nuevamente.'], 403);
  }
}

$accion = $_GET['accion'] ?? 'sucursales';
if ($accion === 'login') {
  $entrada = leerJson();
  $usuario = $entrada['userName'] ?? null;
  $clave = $entrada['password'] ?? null;
  if (!is_string($usuario) || !preg_match('/^(?:[0-9]|10|11)$/D', $usuario)
      || !is_string($clave) || trim($clave) === '') {
    responder(['error' => 'Ingresá una categoría de 0 a 11 y una contraseña no vacía.'], 422);
  }
  session_regenerate_id(true);
  $_SESSION = ['usuario' => $usuario, 'csrf' => bin2hex(random_bytes(32))];
  responder($_SESSION);
}
if ($accion === 'sesion') {
  if ($_SERVER['REQUEST_METHOD'] !== 'GET') responder(['error' => 'Se requiere GET'], 405);
  responder(['usuario' => $_SESSION['usuario'] ?? '', 'csrf' => $_SESSION['csrf'] ?? '']);
}
if (!isset($_SESSION['usuario'])) responder(['error' => 'Iniciá sesión para continuar.'], 401);
if ($accion === 'logout') {
  leerJson();
  verificarToken();
  $_SESSION = [];
  session_destroy();
  setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
  responder(['mensaje' => 'Sesión cerrada']);
}
$permisosEscritura = [
  'crearCliente' => ['10', '11'],
  'borrarCliente' => ['10', '11'],
  'crearSucursal' => ['11'],
  'borrarSucursal' => ['11']
];
if (isset($permisosEscritura[$accion])) {
  if (!in_array($_SESSION['usuario'], $permisosEscritura[$accion], true)) {
    responder(['error' => 'No tenés permiso para realizar esta operación.'], 403);
  }
  $entrada = leerJson();
  verificarToken();
} elseif ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  responder(['error' => 'Se requiere GET'], 405);
}

try {
  $conn = conectar();
} catch (mysqli_sql_exception $error) {
  error_log($error->getMessage());
  responder(['error' => 'No se pudo conectar a la base de datos.'], 503);
}
$sqlCliente = "SELECT * FROM cliente";
$sqlItem = "SELECT * FROM item";
$sqlSucursal = "SELECT * FROM sucursal";
//$result = $conn->query($sqlCliente);
$fechaFactura = new DateTime('2026/01/01');

function insertDatos($conn)
{
  $nroFactura = 0;
  $estados = ["Pendiente", "Activo", "Atrasado"];
  $fechaFactura = new DateTime('2026/01/01');
  for ($d = 1; $d <= 365; $d++) {
    for ($i = 0; $i < 10; $i++) {
      $nroFactura++;
      $fechaFactura;
      $idCliente = rand(1, 40);
      $importe = rand(1000, 50000);
      $iva = $importe * 0.21;
      $estado = rand(1, 3);
      $sucursal = rand(1, 5);

      echo "Factura numero " . $nroFactura . ": " . "<br>";
      echo "Numero del cliente: " . $idCliente . "<br>";
      $fecha = $fechaFactura->format('Y/m/d');
      echo "Fecha emitida: " . $fecha . "<br>";
      echo "El importe a pagar es (+IVA): " . $iva . "<br>";
      echo "El estado es: " . $estados[$estado - 1] . "<br>";
      echo "La sucursal es: " . $sucursal . "<br>";

      echo "------------------------------------" . "<br>";
      $insert = "INSERT INTO factura (fechaFactura, idCliente, idSucursal, importe, iva, estado) VALUES
        ('$fecha', '$idCliente', '$sucursal', '$importe', '$iva', '" . $estados[$estado - 1] . "')";
      if ($conn->multi_query($insert) === TRUE) {
        echo "New records inserted successfully";
      } else {
        echo "Error: " . $insert . "<br>" . $conn->error;
      }
      // $result = $conn->query($insert);
    }
    $fechaFactura->modify('+1 day');
  }
}
;


function ordenarXMeses($conn, int $anio): array
{
  $sucursales = obtenerSucursales($conn);
  $ventas = [];

  // Preparar los doce meses de cada sucursal en cero.
  foreach ($sucursales as $sucursal) {
    $idSucursal = $sucursal['idSucursal'];

    for ($mes = 1; $mes <= 12; $mes++) {
      $ventas[$idSucursal][$mes] = 0;
    }
  }

  $sql = "SELECT
                idSucursal,
                MONTH(FechaFactura) AS mes,
                SUM(Importe) AS total
            FROM facturas
            WHERE YEAR(FechaFactura) = ?
            GROUP BY idSucursal, MONTH(FechaFactura)
            ORDER BY idSucursal, mes";

  $consulta = $conn->prepare($sql);
  $consulta->bind_param('i', $anio);
  $consulta->execute();

  $resultado = $consulta->get_result();

  while ($fila = $resultado->fetch_assoc()) {
    $idSucursal = (int) $fila['idSucursal'];
    $mes = (int) $fila['mes'];

    $ventas[$idSucursal][$mes] = (float) $fila['total'];
  }

  $consulta->close();

  return [
    'anio' => $anio,
    'sucursales' => $sucursales,
    'ventas' => $ventas
  ];
}

function obtenerSucursales($conn): array
{
  $sql = "SELECT idSucursal, nombre, ciudad, direccion, cantempleado
            FROM sucursal
            ORDER BY idSucursal";

  $resultado = mysqli_query($conn, $sql);

  $sucursales = [];

  while ($fila = mysqli_fetch_assoc($resultado)) {
    $fila['idSucursal'] = (int) $fila['idSucursal'];
    $fila['cantempleado'] = (int) $fila['cantempleado'];

    $sucursales[] = $fila;
  }

  return $sucursales;
}

function obtenerClientes($conn): array
{
  $sql = "SELECT idCliente, nombre, apellido, situacionFiscal, dni
            FROM cliente
            ORDER BY idCliente";

  $resultado = mysqli_query($conn, $sql);

  $clientes = [];

  while ($fila = mysqli_fetch_assoc($resultado)) {
    $fila['idCliente'] = (int) $fila['idCliente'];
    $fila['dni'] = (int) $fila['dni'];

    $clientes[] = $fila;
  }

  return $clientes;
}

// Los nombres SQL salen de esta lista fija, nunca de los datos de la petición.
function borrarSinFacturas(mysqli $conn, string $tipo, int $id): array
{
  [$tabla, $clave, $referencia] = $tipo === 'cliente'
    ? ['cliente', 'idCliente', 'IdCliente']
    : ['sucursal', 'idSucursal', 'idSucursal'];
  $conn->begin_transaction();
  try {
    $consulta = $conn->prepare("SELECT $clave FROM $tabla WHERE $clave = ? FOR UPDATE");
    $consulta->bind_param('i', $id);
    $consulta->execute();
    $existe = $consulta->get_result()->num_rows > 0;
    $consulta->close();
    if (!$existe) {
      $conn->rollback();
      responder(['error' => 'El registro ya no existe. Recargá la lista.'], 404);
    }
    $consulta = $conn->prepare("SELECT NroFactura FROM facturas WHERE $referencia = ? LIMIT 1");
    $consulta->bind_param('i', $id);
    $consulta->execute();
    $tieneFacturas = $consulta->get_result()->num_rows > 0;
    $consulta->close();
    if ($tieneFacturas) {
      $conn->rollback();
      responder(['error' => 'No se puede borrar: tiene facturas asociadas. Se conserva el historial de ventas.'], 409);
    }
    $consulta = $conn->prepare("DELETE FROM $tabla WHERE $clave = ?");
    $consulta->bind_param('i', $id);
    $consulta->execute();
    $consulta->close();
    $conn->commit();
    return ['mensaje' => 'Registro eliminado de la base de datos.', 'id' => $id];
  } catch (Throwable $error) {
    $conn->rollback();
    throw $error;
  }
}

try {
switch ($accion) {
  case 'crearSucursal':
    $nombre = is_string($entrada['nombre'] ?? null) ? trim($entrada['nombre']) : '';
    $ciudad = is_string($entrada['ciudad'] ?? null) ? trim($entrada['ciudad']) : '';
    $direccion = is_string($entrada['direccion'] ?? null) ? trim($entrada['direccion']) : '';
    $empleados = filter_var($entrada['cantempleado'] ?? null, FILTER_VALIDATE_INT,
      ['options' => ['min_range' => 0, 'max_range' => 2147483647]]);
    if ($nombre === '' || $ciudad === '' || $direccion === '' || mb_strlen($nombre) > 50
        || mb_strlen($ciudad) > 50 || mb_strlen($direccion) > 50 || $empleados === false) {
      responder(['error' => 'Completá nombre, ciudad y dirección (hasta 50 caracteres) y una cantidad entera de empleados mayor o igual a cero.'], 422);
    }
    $consulta = $conn->prepare('INSERT INTO sucursal (nombre, ciudad, direccion, cantempleado) VALUES (?, ?, ?, ?)');
    $consulta->bind_param('sssi', $nombre, $ciudad, $direccion, $empleados);
    $consulta->execute();
    $datos = ['idSucursal' => $conn->insert_id, 'nombre' => $nombre, 'ciudad' => $ciudad,
      'direccion' => $direccion, 'cantempleado' => $empleados];
    $consulta->close();
    http_response_code(201);
    break;
  case 'borrarCliente':
  case 'borrarSucursal':
    $id = filter_var($entrada['id'] ?? null, FILTER_VALIDATE_INT,
      ['options' => ['min_range' => 1, 'max_range' => 2147483647]]);
    if ($id === false) responder(['error' => 'El identificador debe ser un entero positivo.'], 422);
    $datos = borrarSinFacturas($conn, $accion === 'borrarCliente' ? 'cliente' : 'sucursal', $id);
    break;
  case 'crearCliente':
    $nombre = is_string($entrada['nombre'] ?? null) ? trim($entrada['nombre']) : '';
    $apellido = is_string($entrada['apellido'] ?? null) ? trim($entrada['apellido']) : '';
    $situacion = $entrada['situacionFiscal'] ?? '';
    $dni = filter_var($entrada['dni'] ?? null, FILTER_VALIDATE_INT,
      ['options' => ['min_range' => 1, 'max_range' => 99999999]]);
    $situaciones = ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final', 'No Categorizado'];
    if ($nombre === '' || $apellido === '' || mb_strlen($nombre) > 50 || mb_strlen($apellido) > 50
        || !in_array($situacion, $situaciones, true) || $dni === false) {
      responder(['error' => 'Revisá nombre y apellido (hasta 50 caracteres), DNI (1 a 8 dígitos) y situación fiscal.'], 422);
    }
    $consulta = $conn->prepare('INSERT INTO cliente (nombre, apellido, situacionFiscal, dni) VALUES (?, ?, ?, ?)');
    $consulta->bind_param('sssi', $nombre, $apellido, $situacion, $dni);
    $consulta->execute();
    $datos = ['idCliente' => $conn->insert_id, 'nombre' => $nombre, 'apellido' => $apellido,
      'situacionFiscal' => $situacion, 'dni' => $dni];
    $consulta->close();
    http_response_code(201);
    break;
  case 'sucursales':
    $datos = obtenerSucursales($conn);
    break;

  case 'clientes':
    $datos = obtenerClientes($conn);
    break;
  case 'ventas':
    $anio = filter_var(
      $_GET['anio'] ?? '2025',
      FILTER_VALIDATE_INT,
      ['options' => ['min_range' => 1000, 'max_range' => 9999]]
    );

    if ($anio === false) {
      http_response_code(400);
      $datos = ['error' => 'El año debe tener cuatro dígitos'];
      break;
    }

    $datos = ordenarXMeses($conn, $anio);
    break;
  default:
    http_response_code(400);
    $datos = ['error' => 'Acción no válida'];
    break;
}
} catch (mysqli_sql_exception $error) {
  error_log($error->getMessage());
  if ($error->getCode() === 1451) responder(['error' => 'No se puede borrar: el registro tiene datos asociados.'], 409);
  responder(['error' => 'No se pudo completar la operación en la base de datos.'], 500);
}

echo json_encode($datos, JSON_UNESCAPED_UNICODE);

$conn->close();


?>
