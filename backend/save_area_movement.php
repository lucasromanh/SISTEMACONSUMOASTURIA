<?php
// save_area_movement.php
// Endpoint para guardar movimientos de caja (ingresos y egresos)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

// Helper para leer input
function getRequestData() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents("php://input");
        return json_decode($raw, true) ?? [];
    }
    return $_POST;
}

try {
    $data = getRequestData();

    $userId = (int)($data['user_id'] ?? 0);
    $fecha = trim($data['fecha'] ?? '');
    $area = trim($data['area'] ?? '');
    $tipo = trim($data['tipo'] ?? ''); // INGRESO o EGRESO
    $origen = trim($data['origen'] ?? ''); // VENTA, GASTO, MANUAL, etc.
    $descripcion = trim($data['descripcion'] ?? '');
    $monto = (float)($data['monto'] ?? 0);
    $metodoPago = trim($data['metodoPago'] ?? '');

    // Validaciones
    if ($userId <= 0) {
        throw new Exception("user_id inválido");
    }

    if ($fecha === '' || $area === '' || $tipo === '' || $descripcion === '' || $monto <= 0) {
        throw new Exception("Faltan datos obligatorios o el monto es inválido");
    }

    if (!in_array($tipo, ['INGRESO', 'EGRESO'])) {
        throw new Exception("Tipo de movimiento inválido. Debe ser INGRESO o EGRESO");
    }

    // Verificar que el usuario exista y esté activo
    $stmt = $pdo->prepare("SELECT is_active FROM wb_users WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || !$user['is_active']) {
        throw new Exception("Usuario inactivo o no encontrado");
    }

    // Insertar movimiento de caja
    $stmt = $pdo->prepare("
        INSERT INTO area_movements
        (fecha, area, tipo, origen, descripcion, monto, metodo_pago, user_id, created_at)
        VALUES
        (:fecha, :area, :tipo, :origen, :descripcion, :monto, :metodo_pago, :user_id, NOW())
    ");

    $stmt->execute([
        ':fecha' => $fecha,
        ':area' => $area,
        ':tipo' => $tipo,
        ':origen' => $origen,
        ':descripcion' => $descripcion,
        ':monto' => $monto,
        ':metodo_pago' => $metodoPago ?: null,
        ':user_id' => $userId,
    ]);

    $movimientoId = (int)$pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'id' => $movimientoId,
        'message' => 'Movimiento registrado exitosamente',
    ]);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'id' => 0,
        'message' => $e->getMessage(),
    ]);
}
