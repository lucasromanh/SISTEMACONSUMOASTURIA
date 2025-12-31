<?php
// list_consumo_pagos.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

// Helper
function getRequestData() {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return $_GET;
    }
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw  = file_get_contents("php://input");
        return json_decode($raw, true) ?? [];
    }
    return $_POST;
}

// Verifica que el usuario exista y esté activo
function requireActiveUser(PDO $pdo, int $userId) {
    if ($userId <= 0) {
        throw new Exception("user_id inválido");
    }
    $stmt = $pdo->prepare("SELECT is_active FROM wb_users WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u || !$u['is_active']) {
        throw new Exception("Usuario inactivo o no encontrado");
    }
}

try {
    $data     = getRequestData();
    $userId   = (int)($data['user_id'] ?? 0);
    $consumoId= (int)($data['consumo_id'] ?? 0);

    requireActiveUser($pdo, $userId);

    if ($consumoId <= 0) {
        throw new Exception("consumo_id inválido");
    }

    $stmt = $pdo->prepare("
        SELECT p.*, u.username AS usuario_registro
        FROM wb_consumo_pagos p
        LEFT JOIN wb_users u ON u.id = p.usuario_registro_id
        WHERE p.consumo_id = :cid
        ORDER BY p.fecha ASC, p.id ASC
    ");
    $stmt->execute([':cid' => $consumoId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ✅ NUEVO: Formatear datos de transferencia y tarjeta como objetos JSON
    $pagos = array_map(function($row) {
        $pago = $row;
        
        // Si tiene datos de transferencia, crear objeto datosTransferencia
        if ($row['metodo'] === 'TRANSFERENCIA' && !empty($row['numero_operacion'])) {
            $pago['datosTransferencia'] = [
                'imagenComprobante' => $row['imagen_comprobante'] ?? null,
                'numeroOperacion' => $row['numero_operacion'],
                'banco' => $row['banco'],
                'aliasCbu' => $row['alias_cbu'],
                'hora' => $row['hora'],
            ];
        }
        
        // Si tiene datos de tarjeta, decodificar JSON
        if ($row['metodo'] === 'TARJETA_CREDITO' && !empty($row['datos_tarjeta'])) {
            $pago['datosTarjeta'] = json_decode($row['datos_tarjeta'], true);
            // Agregar imagen del comprobante si existe
            if (!empty($row['imagen_comprobante'])) {
                $pago['datosTarjeta']['imagenComprobante'] = $row['imagen_comprobante'];
            }
        }
        
        return $pago;
    }, $rows);

    echo json_encode([
        'success' => true,
        'pagos'   => $pagos,
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
