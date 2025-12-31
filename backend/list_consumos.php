<?php
// list_consumos.php
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
    $stmt = $pdo->prepare("SELECT role, is_active FROM wb_users WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u || !$u['is_active']) {
        throw new Exception("Usuario inactivo o no encontrado");
    }
    return $u['role'];
}

// ¿Usuario tiene acceso a área?
function userHasArea(PDO $pdo, int $userId, string $area) {
    $stmt = $pdo->prepare("
        SELECT 1 FROM wb_user_areas
        WHERE user_id = :uid AND area_code = :area
        LIMIT 1
    ");
    $stmt->execute([':uid' => $userId, ':area' => $area]);
    return (bool)$stmt->fetch();
}

try {
    $data   = getRequestData();
    $userId = (int)($data['user_id'] ?? 0);
    $area   = trim($data['area'] ?? '');
    $from   = trim($data['from'] ?? '');
    $to     = trim($data['to']   ?? '');
    $estado = trim($data['estado'] ?? '');

    $role = requireActiveUser($pdo, $userId);

    // ✅ MODIFICADO: Agregar LEFT JOIN con wb_consumo_pagos para traer datos de transferencia y tarjeta
    // Usar alias diferentes para evitar conflictos de nombres
    $sql = "SELECT c.*, u.username AS usuario_registro,
                   c.datos_tarjeta AS consumo_datos_tarjeta,
                   c.imagen_comprobante AS consumo_imagen_comprobante,
                   GROUP_CONCAT(DISTINCT CASE WHEN p.metodo = 'TRANSFERENCIA' THEN p.imagen_comprobante END) AS pago_imagen_transferencia,
                   GROUP_CONCAT(DISTINCT CASE WHEN p.metodo = 'TRANSFERENCIA' THEN p.numero_operacion END) AS pago_numero_operacion,
                   GROUP_CONCAT(DISTINCT CASE WHEN p.metodo = 'TRANSFERENCIA' THEN p.banco END) AS pago_banco,
                   GROUP_CONCAT(DISTINCT CASE WHEN p.metodo = 'TRANSFERENCIA' THEN p.alias_cbu END) AS pago_alias_cbu,
                   GROUP_CONCAT(DISTINCT CASE WHEN p.metodo = 'TRANSFERENCIA' THEN p.hora END) AS pago_hora_transferencia,
                   GROUP_CONCAT(DISTINCT CASE WHEN p.metodo = 'TARJETA_CREDITO' THEN p.datos_tarjeta END) AS pago_datos_tarjeta,
                   GROUP_CONCAT(DISTINCT CASE WHEN p.metodo = 'TARJETA_CREDITO' THEN p.imagen_comprobante END) AS pago_imagen_tarjeta
            FROM wb_consumos c
            LEFT JOIN wb_users u ON u.id = c.usuario_registro_id
            LEFT JOIN wb_consumo_pagos p ON p.consumo_id = c.id
            WHERE 1=1";
    $params = [];

    if ($area !== '') {
        if ($role !== 'ADMIN' && !userHasArea($pdo, $userId, $area)) {
            throw new Exception("No tenés acceso al área especificada");
        }
        $sql .= " AND c.area = :area";
        $params[':area'] = $area;
    } elseif ($role !== 'ADMIN') {
        $sql .= " AND c.area IN (SELECT area_code FROM wb_user_areas WHERE user_id = :uid)";
        $params[':uid'] = $userId;
    }

    if ($from !== '') {
        $sql .= " AND c.fecha >= :from";
        $params[':from'] = $from;
    }
    if ($to !== '') {
        $sql .= " AND c.fecha <= :to";
        $params[':to'] = $to;
    }
    if ($estado !== '') {
        $sql .= " AND c.estado = :estado";
        $params[':estado'] = $estado;
    }

    $sql .= " GROUP BY c.id ORDER BY c.fecha DESC, c.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ✅ NUEVO: Formatear datos de transferencia y tarjeta como objetos JSON
    $consumos = array_map(function($row) {
        $consumo = $row;
        
        // Si tiene datos de transferencia desde wb_consumo_pagos, crear objeto datosTransferencia
        if (!empty($row['pago_imagen_transferencia'])) {
            $consumo['datosTransferencia'] = [
                'imagenComprobante' => $row['pago_imagen_transferencia'],
                'numeroOperacion' => $row['pago_numero_operacion'],
                'banco' => $row['pago_banco'],
                'aliasCbu' => $row['pago_alias_cbu'],
                'hora' => $row['pago_hora_transferencia'],
            ];
        }
        
        // Si tiene datos de tarjeta desde wb_consumos
        if (!empty($row['consumo_datos_tarjeta'])) {
            $consumo['datosTarjeta'] = json_decode($row['consumo_datos_tarjeta'], true);
            // Agregar imagen del comprobante desde wb_consumos si existe
            if (!empty($row['consumo_imagen_comprobante'])) {
                $consumo['datosTarjeta']['imagenComprobante'] = $row['consumo_imagen_comprobante'];
            }
        }
        // Si no hay en consumos, buscar en pagos
        elseif (!empty($row['pago_datos_tarjeta'])) {
            $consumo['datosTarjeta'] = json_decode($row['pago_datos_tarjeta'], true);
            // Agregar imagen del comprobante desde wb_consumo_pagos si existe
            if (!empty($row['pago_imagen_tarjeta'])) {
                $consumo['datosTarjeta']['imagenComprobante'] = $row['pago_imagen_tarjeta'];
            }
        }
        
        // Remover campos temporales
        unset($consumo['pago_imagen_transferencia']);
        unset($consumo['pago_numero_operacion']);
        unset($consumo['pago_banco']);
        unset($consumo['pago_alias_cbu']);
        unset($consumo['pago_hora_transferencia']);
        unset($consumo['consumo_datos_tarjeta']);
        unset($consumo['consumo_imagen_comprobante']);
        unset($consumo['pago_datos_tarjeta']);
        unset($consumo['pago_imagen_tarjeta']);
        
        return $consumo;
    }, $rows);

    echo json_encode([
        'success'  => true,
        'consumos' => $consumos,
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
