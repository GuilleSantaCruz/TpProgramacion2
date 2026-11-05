# Sesión simulada y alta de clientes

## Cómo probarlo

1. Encender MySQL en XAMPP (puerto 3310).
2. Desde la raíz: `& "C:\xampp\php\php.exe" -S localhost:8000 -t backend`.
3. En otra terminal: `npm start`.
4. Ingresar con usuario 0 a 9, 10 o 11 y cualquier contraseña no vacía.
5. En Clientes, 10 y 11 pueden completar el formulario y guardar. Los usuarios
   normales solo ven la lista. El cliente permanece en MySQL al recargar.

## Qué cambió respecto del ejemplo

El login sigue siendo simulado y no existe una tabla de usuarios. Ahora PHP
conserva la categoría en `$_SESSION`; el navegador recibe una cookie de sesión
HttpOnly. Angular consulta la sesión al navegar, por lo que recargar ya no la
elimina. Cerrar sesión destruye la sesión en PHP.

Quien conoce el ejemplo puede elegir 10 u 11: no es autenticación real. Los
permisos sí se comprueban en PHP usando la categoría de esa sesión; el servidor
no confía en una categoría incluida en el formulario de clientes.

## Archivos y responsabilidades

- `src/app/auth/user.ts`: modelo de los datos de ingreso.
- `src/app/auth/auth.service.ts`: peticiones de login, sesión y logout. Conserva
  BehaviorSubject para actualizar el menú, como en el ejemplo del profesor.
- `src/app/auth/auth.guard.ts`: consulta la sesión PHP para decidir si permite
  navegar. Jefe está reservado a 10 y 11.
- `src/app/components/login/`: formulario reactivo de ingreso y mensajes de error.
- `src/app/components/clientes/`: formulario reactivo de alta, validación,
  indicador de guardado y listado.
- `src/app/services/clientes.service.ts`: consulta clientes y envía el alta por POST.
- `backend/facturacion.php`: acciones login/sesion/logout, permisos, validación y
  consultas SQL. Se conserva el mismo archivo PHP de trabajo.

## Recorrido del alta

Formulario -> ClientesService -> POST accion=crearCliente -> permiso en PHP ->
validación -> INSERT preparado -> respuesta 201 con el ID generado -> lista Angular.

La lista se actualiza únicamente después de la confirmación del servidor. Si hay
un error, se conserva el formulario y no se muestra un éxito falso. Los campos
admitidos son nombre, apellido, DNI y situación fiscal; MySQL genera idCliente.
Nombre y apellido tienen hasta 50 caracteres; DNI es un entero de 1 a 8 dígitos;
la situación fiscal debe ser una de las cinco categorías existentes en la base.

Las escrituras incluyen un token CSRF vinculado a la sesión. No es la categoría
ni una contraseña: PHP lo compara para comprobar que la petición usa la sesión
que obtuvo el formulario. Las consultas preparadas separan los datos del SQL.

## Estado actual de permisos

- 0 a 9: consultar sucursales, clientes y ventas.
- 10 y 11: las mismas consultas y crear clientes.
- 10 y 11: pantalla Jefe de demostración.

Editar clientes, crear sucursales, gestionar ítems y crear facturas son siguientes
etapas; todavía no están implementadas.

## Comprobaciones

- `npm run build`
- `npm test -- --watch=false --include=src/app/auth/auth.spec.ts`
- Integración real: iniciar PHP en el puerto 8011 con `-t backend` y ejecutar
  `& "C:\xampp\php\php.exe" tests/clientes-api.php`. Crea dos clientes temporales,
  verifica permisos y persistencia, y elimina únicamente esos registros al terminar.
  Los identificadores autoincrementales pueden avanzar por esas pruebas.
