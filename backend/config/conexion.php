<?php

function conectar(): mysqli
{
    $conexion = mysqli_connect(
        'localhost',
        'root',
        '',
        'bdfacturas',
        3310
    );

    mysqli_set_charset($conexion, 'utf8mb4');

    return $conexion;
}
