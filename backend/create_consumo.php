<?php
// create_consumo.php
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

// ✅ NUEVO: Verificar si la categoría NO debe reducir stock
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
    
    // Comparación case-insensitive
    foreach ($categoriasExcluidas as $excluida) {
        if (strcasecmp($categoria, $excluida) === 0) {
            return false;
        }
    }
    
    return true;
}

// ✅ NUEVO: Reducir stock automáticamente
function reducirStock(PDO $pdo, string $area, string $productoNombre, float $cantidad, int $userId, int $consumoId) {
    // Buscar el producto en stock por nombre y área
    $stmt = $pdo->prepare("
        SELECT id, stock_actual, stock_minimo, nombre
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
        // Si no existe en stock, no hacer nada (producto sin inventario)
        return [
            'stock_reducido' => false,
            'mensaje' => 'Producto no tiene inventario registrado'
        ];
    }
    
    $stockActual = (float)$stockItem['stock_actual'];
    $stockMinimo = (float)$stockItem['stock_minimo'];
    $stockItemId = (int)$stockItem['id'];
    
    // Verificar si hay stock disponible
    if ($stockActual <= 0) {
        throw new Exception("⚠️ Stock agotado para '{$productoNombre}'. No se puede vender.");
    }
    
    // Calcular nuevo stock
    $nuevoStock = $stockActual - $cantidad;
    
    // Actualizar stock
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
    
    // Registrar movimiento en historial
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
        ':motivo' => "Venta de consumo #{$consumoId}",
        ':consumo_id' => $consumoId,
        ':user_id' => $userId
    ]);
    
    // Verificar si llegó al stock mínimo
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
        'alerta' => $alerta
    ];
}

try {
    $data = getRequestData();

    $userId   = (int)($data['user_id'] ?? 0);
    $fecha    = trim($data['fecha'] ?? ''); // ISO (YYYY-MM-DD HH:MM:SS)
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

    requireActiveUser($pdo, $userId);
    requireUserArea($pdo, $userId, $area);

    if ($fecha === '' || $area === '' || $habCli === '' || $desc === '' ||
        $categoria === '' || $precio <= 0 || $cantidad <= 0) {
        throw new Exception("Datos incompletos o inválidos para el consumo");
    }

    $total = $precio * $cantidad;

    // Iniciar transacción para asegurar consistencia
    $pdo->beginTransaction();

    try {
        // Insertar consumo
        $stmt = $pdo->prepare("
            INSERT INTO wb_consumos
            (fecha, area, habitacion_cliente, consumo_descripcion, categoria,
             precio_unitario, cantidad, total, estado, metodo_pago, monto_pagado, usuario_registro_id, ticket_id)
            VALUES
            (:fecha, :area, :hab, :desc, :cat,
             :precio, :cant, :total, :estado, :metodo_pago, :monto_pagado, :uid, :ticket_id)
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
            ':uid'         => $userId,
            ':ticket_id'   => $ticketId ?: null,
        ]);

        $consumoId = (int)$pdo->lastInsertId();

        // ✅ NUEVO: Reducir stock si la categoría lo requiere
        $stockInfo = ['stock_reducido' => false];
        if (shouldReduceStock($categoria)) {
            $stockInfo = reducirStock($pdo, $area, $desc, $cantidad, $userId, $consumoId);
        }

        $pdo->commit();

        // Respuesta con información de stock
        $response = [
            'success' => true,
            'id'      => $consumoId,
            'total'   => $total,
            'stock_info' => $stockInfo
        ];

        // Agregar alerta si existe
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
