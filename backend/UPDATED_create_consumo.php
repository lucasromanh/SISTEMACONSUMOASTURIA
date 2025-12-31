<?php
// create_consumo.php - ACTUALIZADO PARA TARJETA DE CRÉDITO
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

// ✅ Verificar si la categoría NO debe reducir stock
function shouldReduceStock(string $categoria): bool {
    $categoriasExcluidas = [
        'Menu',
        'Menú',
        'Plato del dia',
        'Plato del día',
        'Postres',
        'Guarniciones',
        'Entradas'
    ];
    
    foreach ($categoriasExcluidas as $excluida) {
        if (strcasecmp($categoria, $excluida) === 0) {
            return false;
        }
    }
    
    return true;
}

// ✅ Reducir stock automáticamente con búsqueda en cascada
function reducirStock(PDO $pdo, string $area, string $productoNombre, float $cantidad, int $userId, int $consumoId) {
    $stmt = $pdo->prepare("
        SELECT id, stock_actual, stock_minimo, nombre, categoria, area
        FROM wb_stock_items
        WHERE area = :area AND nombre = :nombre
        LIMIT 1
    ");
    $stmt->execute([
        ':area' => $area,
        ':nombre' => $productoNombre
    ]);
    
    $stockItem = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$stockItem) {
        $stmt->execute([
            ':area' => 'GENERAL',
            ':nombre' => $productoNombre
        ]);
        $stockItem = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$stockItem) {
        return [
            'stock_reducido' => false,
            'mensaje' => 'Producto no tiene inventario registrado'
        ];
    }
    
    $stockActual = (float)$stockItem['stock_actual'];
    $stockMinimo = (float)$stockItem['stock_minimo'];
    $stockItemId = (int)$stockItem['id'];
    $areaEncontrada = $stockItem['area'];
    
    if ($stockActual <= 0) {
        throw new Exception("⚠️ Stock agotado para '{$productoNombre}'. No se puede vender.");
    }
    
    $nuevoStock = $stockActual - $cantidad;
    
    $stmtUpdate = $pdo->prepare("
        UPDATE wb_stock_items
        SET stock_actual = :nuevo_stock,
            updated_at = NOW()
        WHERE id = :id
    ");
    $stmtUpdate->execute([
        ':nuevo_stock' => $nuevoStock,
        ':id' => $stockItemId
    ]);
    
    $stmtMov = $pdo->prepare("
        INSERT INTO wb_stock_movimientos
        (stock_item_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, consumo_id, user_id)
        VALUES
        (:stock_item_id, 'EGRESO', :cantidad, :stock_anterior, :stock_nuevo, :motivo, :consumo_id, :user_id)
    ");
    $stmtMov->execute([
        ':stock_item_id' => $stockItemId,
        ':cantidad' => $cantidad,
        ':stock_anterior' => $stockActual,
        ':stock_nuevo' => $nuevoStock,
        ':motivo' => "Venta de consumo #{$consumoId} (creación) (área: {$area}, stock desde: {$areaEncontrada})",
        ':consumo_id' => $consumoId,
        ':user_id' => $userId
    ]);
    
    $alerta = '';
    if ($nuevoStock <= $stockMinimo && $nuevoStock > 0) {
        $alerta = "⚠️ ALERTA: Stock de '{$productoNombre}' llegó al mínimo ({$nuevoStock} unidades). Reponer pronto.";
    } elseif ($nuevoStock <= 0) {
        $alerta = "🚨 CRÍTICO: Stock de '{$productoNombre}' AGOTADO. Reponer urgente.";
    }
    
    return [
        'stock_reducido' => true,
        'stock_anterior' => $stockActual,
        'stock_nuevo' => $nuevoStock,
        'area_stock' => $areaEncontrada,
        'alerta' => $alerta
    ];
}

// Verifica que el usuario tenga acceso a un área concreta (o sea ADMIN)
function requireUserArea(PDO $pdo, int $userId, string $area) {
    $stmt = $pdo->prepare("SELECT role FROM wb_users WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($u && $u['role'] === 'ADMIN') return;

    $stmt2 = $pdo->prepare("
        SELECT 1 FROM wb_user_areas
        WHERE user_id = :uid AND area_code = :area
        LIMIT 1
    ");
    $stmt2->execute([':uid' => $userId, ':area' => $area]);
    if (!$stmt2->fetch()) {
        throw new Exception("El usuario no tiene acceso al área");
    }
}

try {
    $data = getRequestData();

    $userId   = (int)($data['user_id'] ?? 0);
    $fecha    = trim($data['fecha'] ?? '');
    $area     = trim($data['area']  ?? '');
    $habCli   = trim($data['habitacion_cliente'] ?? '');
    $desc     = trim($data['consumo_descripcion'] ?? '');
    $categoria= trim($data['categoria'] ?? '');
    $precio   = (float)($data['precio_unitario'] ?? 0);
    $cantidad = (float)($data['cantidad'] ?? 0);
    $estado   = trim($data['estado'] ?? 'CARGAR_HABITACION');
    $ticketId = isset($data['ticket_id']) ? (int)$data['ticket_id'] : null;
    
    $metodoPago = trim($data['metodo_pago'] ?? '');
    $montoPagado = isset($data['monto_pagado']) ? (float)$data['monto_pagado'] : null;
    
    // ✅ NUEVO: Recibir datos de tarjeta e imagen
    $datosTarjeta = isset($data['datos_tarjeta']) ? json_encode($data['datos_tarjeta']) : null;
    $imagenComprobante = trim($data['imagen_comprobante'] ?? '');

    requireActiveUser($pdo, $userId);
    requireUserArea($pdo, $userId, $area);

    if ($fecha === '' || $area === '' || $habCli === '' || $desc === '' ||
        $categoria === '' || $precio <= 0 || $cantidad <= 0) {
        throw new Exception("Datos incompletos o inválidos para el consumo");
    }

    // ✅ NUEVO: Validar que TARJETA_CREDITO tenga datos obligatorios
    if ($metodoPago === 'TARJETA_CREDITO') {
        $tarjetaData = json_decode($datosTarjeta, true);
        if (!$tarjetaData || empty($tarjetaData['numeroAutorizacion'])) {
            throw new Exception("Número de autorización es obligatorio para pagos con tarjeta");
        }
        if (empty($tarjetaData['tipoTarjeta']) || empty($tarjetaData['marcaTarjeta'])) {
            throw new Exception("Tipo y marca de tarjeta son obligatorios");
        }
    }

    $total = $precio * $cantidad;

    $pdo->beginTransaction();

    try {
        // ✅ ACTUALIZADO: Insertar consumo con datos_tarjeta e imagen_comprobante
        $stmt = $pdo->prepare("
            INSERT INTO wb_consumos
            (fecha, area, habitacion_cliente, consumo_descripcion, categoria,
             precio_unitario, cantidad, total, estado, metodo_pago, monto_pagado, 
             datos_tarjeta, imagen_comprobante, usuario_registro_id, ticket_id)
            VALUES
            (:fecha, :area, :hab, :desc, :cat,
             :precio, :cant, :total, :estado, :metodo_pago, :monto_pagado,
             :datos_tarjeta, :imagen_comprobante, :uid, :ticket_id)
        ");
        $stmt->execute([
            ':fecha'       => $fecha,
            ':area'        => $area,
            ':hab'         => $habCli,
            ':desc'        => $desc,
            ':cat'         => $categoria,
            ':precio'      => $precio,
            ':cant'        => $cantidad,
            ':total'       => $total,
            ':estado'      => $estado,
            ':metodo_pago' => $metodoPago ?: null,
            ':monto_pagado'=> $montoPagado,
            ':datos_tarjeta' => $datosTarjeta,
            ':imagen_comprobante' => $imagenComprobante ?: null,
            ':uid'         => $userId,
            ':ticket_id'   => $ticketId ?: null,
        ]);

        $consumoId = (int)$pdo->lastInsertId();

        // Reducir stock si la categoría lo requiere
        $stockInfo = ['stock_reducido' => false];
        if (shouldReduceStock($categoria)) {
            $stockInfo = reducirStock($pdo, $area, $desc, $cantidad, $userId, $consumoId);
        }

        $pdo->commit();

        $response = [
            'success' => true,
            'id'      => $consumoId,
            'total'   => $total,
            'stock_info' => $stockInfo
        ];

        if (!empty($stockInfo['alerta'])) {
            $response['alerta_stock'] = $stockInfo['alerta'];
        }

        echo json_encode($response);

    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
