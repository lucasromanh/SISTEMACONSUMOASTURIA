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

// 🔍 DEBUG: Archivo de log
$debugFile = __DIR__ . '/debug_list_consumos.txt';

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

    // 🔍 DEBUG: Log de parámetros recibidos
    $debugMsg = "\n" . date('Y-m-d H:i:s') . " - LIST_CONSUMOS CALLED\n";
    $debugMsg .= "Parámetros: user_id={$userId}, area={$area}, from={$from}, to={$to}, estado={$estado}\n";
    file_put_contents($debugFile, $debugMsg, FILE_APPEND);

    $role = requireActiveUser($pdo, $userId);

    // ✅ IMPORTANTE: Aumentar límite de GROUP_CONCAT para imágenes base64 largas
    $pdo->exec("SET SESSION group_concat_max_len = 10000000");

    // ✅ MODIFICADO: Usar subconsultas en lugar de GROUP_CONCAT para evitar límites
    $sql = "SELECT c.id, c.fecha, c.area, c.habitacion_cliente, c.consumo_descripcion, 
                   c.categoria, c.precio_unitario, c.cantidad, c.total, c.estado,
                   c.monto_pagado, c.metodo_pago, c.usuario_registro_id, c.ticket_id,
                   c.created_at,
                   u.username AS usuario_registro,
                   c.datos_tarjeta AS consumo_datos_tarjeta,
                   c.imagen_comprobante AS consumo_imagen_comprobante,
                   (SELECT p.imagen_comprobante FROM wb_consumo_pagos p WHERE p.consumo_id = c.id AND p.metodo = 'TRANSFERENCIA' LIMIT 1) AS pago_imagen_transferencia,
                   (SELECT p.numero_operacion FROM wb_consumo_pagos p WHERE p.consumo_id = c.id AND p.metodo = 'TRANSFERENCIA' LIMIT 1) AS pago_numero_operacion,
                   (SELECT p.banco FROM wb_consumo_pagos p WHERE p.consumo_id = c.id AND p.metodo = 'TRANSFERENCIA' LIMIT 1) AS pago_banco,
                   (SELECT p.alias_cbu FROM wb_consumo_pagos p WHERE p.consumo_id = c.id AND p.metodo = 'TRANSFERENCIA' LIMIT 1) AS pago_alias_cbu,
                   (SELECT p.hora FROM wb_consumo_pagos p WHERE p.consumo_id = c.id AND p.metodo = 'TRANSFERENCIA' LIMIT 1) AS pago_hora_transferencia,
                   (SELECT p.datos_tarjeta FROM wb_consumo_pagos p WHERE p.consumo_id = c.id AND p.metodo = 'TARJETA_CREDITO' LIMIT 1) AS pago_datos_tarjeta,
                   (SELECT p.imagen_comprobante FROM wb_consumo_pagos p WHERE p.consumo_id = c.id AND p.metodo = 'TARJETA_CREDITO' LIMIT 1) AS pago_imagen_tarjeta
            FROM wb_consumos c
            LEFT JOIN wb_users u ON u.id = c.usuario_registro_id
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

    $sql .= " ORDER BY c.fecha DESC, c.id DESC";

    // 🔍 DEBUG: Log del SQL ejecutado
    $debugMsg = date('Y-m-d H:i:s') . " - SQL ejecutado con " . count($params) . " parámetros\n";
    file_put_contents($debugFile, $debugMsg, FILE_APPEND);

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 🔍 DEBUG: Log de resultados obtenidos
    $debugMsg = date('Y-m-d H:i:s') . " - Filas obtenidas: " . count($rows) . "\n";
    file_put_contents($debugFile, $debugMsg, FILE_APPEND);

    // ✅ NUEVO: Formatear datos de transferencia y tarjeta como objetos JSON
    $consumos = array_map(function($row) {
        $consumo = $row;
        
        // 🔍 DEBUG: Log del metodo_pago que viene de la BD
        $metodoPagoValue = $row['metodo_pago'] ?? 'NO EXISTE';
        error_log("📖 LIST_CONSUMOS - ID: " . $row['id'] . ", metodo_pago DB: " . var_export($metodoPagoValue, true));
        
        global $debugFile;
        $debugMsg = date('Y-m-d H:i:s') . " - ID: {$row['id']}, metodo_pago: " . var_export($metodoPagoValue, true) . ", estado: {$row['estado']}\n";
        file_put_contents($debugFile, $debugMsg, FILE_APPEND);
        
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
        
        // ✅ CORREGIDO: Manejo de datos de tarjeta e imagen
        // Primero verificar si hay datos de tarjeta en wb_consumos O en wb_consumo_pagos
        $hasDatosTarjetaConsumo = !empty($row['consumo_datos_tarjeta']);
        $hasDatosTarjetaPago = !empty($row['pago_datos_tarjeta']);
        $hasImagenTarjeta = !empty($row['pago_imagen_tarjeta']);
        
        // 🔍 DEBUG
        $debugMsg = "  → Consumo #{$row['id']} - Tarjeta check:\n";
        $debugMsg .= "     consumo_datos_tarjeta: " . ($hasDatosTarjetaConsumo ? 'SI' : 'NO') . "\n";
        $debugMsg .= "     pago_datos_tarjeta: " . ($hasDatosTarjetaPago ? 'SI' : 'NO') . "\n";
        $debugMsg .= "     pago_imagen_tarjeta length: " . strlen($row['pago_imagen_tarjeta'] ?? '') . "\n";
        file_put_contents($debugFile, $debugMsg, FILE_APPEND);
        
        if ($hasDatosTarjetaConsumo || $hasDatosTarjetaPago || $hasImagenTarjeta) {
            // Priorizar datos de wb_consumos, luego de wb_consumo_pagos
            if ($hasDatosTarjetaConsumo) {
                $consumo['datosTarjeta'] = json_decode($row['consumo_datos_tarjeta'], true);
                file_put_contents($debugFile, "     → Usando consumo_datos_tarjeta\n", FILE_APPEND);
            } elseif ($hasDatosTarjetaPago) {
                $consumo['datosTarjeta'] = json_decode($row['pago_datos_tarjeta'], true);
                file_put_contents($debugFile, "     → Usando pago_datos_tarjeta\n", FILE_APPEND);
            } else {
                // Si solo hay imagen pero no datos, crear objeto vacío
                $consumo['datosTarjeta'] = [];
                file_put_contents($debugFile, "     → Creando datosTarjeta vacío para imagen\n", FILE_APPEND);
            }
            
            // ✅ SIEMPRE agregar imagen si existe en wb_consumo_pagos (tiene prioridad)
            if ($hasImagenTarjeta) {
                $consumo['datosTarjeta']['imagenComprobante'] = $row['pago_imagen_tarjeta'];
                file_put_contents($debugFile, "     → ✅ Imagen agregada desde pago_imagen_tarjeta\n", FILE_APPEND);
            }
            // Fallback: usar imagen de wb_consumos si existe
            elseif (!empty($row['consumo_imagen_comprobante'])) {
                $consumo['datosTarjeta']['imagenComprobante'] = $row['consumo_imagen_comprobante'];
                file_put_contents($debugFile, "     → ✅ Imagen agregada desde consumo_imagen_comprobante (fallback)\n", FILE_APPEND);
            } else {
                file_put_contents($debugFile, "     → ⚠️ NO hay imagen disponible\n", FILE_APPEND);
            }
            
            // 🔍 DEBUG final
            $hasImagen = isset($consumo['datosTarjeta']['imagenComprobante']);
            file_put_contents($debugFile, "     → FINAL: imagenComprobante en datosTarjeta: " . ($hasImagen ? 'SI' : 'NO') . "\n", FILE_APPEND);
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

    // 🔍 DEBUG: Log de consumos enviados al frontend
    $debugMsg = date('Y-m-d H:i:s') . " - Enviando " . count($consumos) . " consumos al frontend\n";
    $debugMsg .= "Primeros 3 IDs y métodos: ";
    foreach (array_slice($consumos, 0, 3) as $c) {
        $debugMsg .= "[ID:{$c['id']}, metodo:{$c['metodo_pago']}] ";
    }
    $debugMsg .= "\n";
    
    // 🔍 DEBUG ESPECÍFICO: Ver qué tiene cada consumo de tarjeta
    foreach ($consumos as $c) {
        if ($c['metodo_pago'] === 'TARJETA_CREDITO') {
            $debugMsg .= "  → TARJETA ID {$c['id']}:\n";
            $debugMsg .= "     tiene datosTarjeta: " . (isset($c['datosTarjeta']) ? 'SI' : 'NO') . "\n";
            if (isset($c['datosTarjeta'])) {
                $debugMsg .= "     datosTarjeta keys: " . implode(', ', array_keys($c['datosTarjeta'])) . "\n";
                $debugMsg .= "     tiene imagenComprobante: " . (isset($c['datosTarjeta']['imagenComprobante']) ? 'SI (' . strlen($c['datosTarjeta']['imagenComprobante']) . ' chars)' : 'NO') . "\n";
            }
        }
    }
    
    file_put_contents($debugFile, $debugMsg, FILE_APPEND);

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
