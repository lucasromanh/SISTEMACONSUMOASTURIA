<?php
// create_consumo_pago.php
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

// ✅ MODIFICADO: Reducir stock automáticamente con búsqueda en cascada
function reducirStock(PDO $pdo, string $area, string $productoNombre, float $cantidad, int $userId, int $consumoId) {
    // 1️⃣ Buscar primero en el área específica
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
    
    // 2️⃣ Si no se encuentra, buscar en área GENERAL como fallback
    if (!$stockItem) {
        $stmt->execute([
            ':area' => 'GENERAL',
            ':nombre' => $productoNombre
        ]);
        $stockItem = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // 3️⃣ Si aún no existe en stock, no hacer nada (producto sin inventario)
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
        ':motivo' => "Venta de consumo #{$consumoId} (pago) (área: {$area}, stock desde: {$areaEncontrada})",
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
        'area_stock' => $areaEncontrada,
        'alerta' => $alerta
    ];
}

/**
 * Sincroniza un pago de consumo con:
 *  - area_movements (como INGRESO)
 *  - la otra app de caja diaria (add_entry.php)
 */
function syncPagoToAreaMovementsAndCaja(PDO $pdo, int $consumoId, int $pagoId) {
    // Traer datos del consumo + pago + usuario + área
    $stmt = $pdo->prepare("
        SELECT 
            c.id            AS consumo_id,
            c.area          AS area,
            c.habitacion_cliente,
            c.consumo_descripcion,
            c.total         AS total_consumo,
            p.id            AS pago_id,
            p.fecha         AS fecha_pago,
            p.metodo        AS metodo_pago,
            p.monto         AS monto_pago,
            u.id            AS user_id,
            u.username      AS username
        FROM wb_consumos c
        JOIN wb_consumo_pagos p ON p.consumo_id = c.id
        LEFT JOIN wb_users u ON u.id = p.usuario_registro_id
        WHERE c.id = :cid AND p.id = :pid
        LIMIT 1
    ");
    $stmt->execute([
        ':cid' => $consumoId,
        ':pid' => $pagoId,
    ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        // No hay nada que sincronizar
        return;
    }

    $userId    = (int)($row['user_id'] ?? 0);
    $fecha     = $row['fecha_pago'];
    $area      = $row['area'] ?: 'GENERAL';
    $metodo    = $row['metodo_pago'];
    $monto     = (float)$row['monto_pago'];
    $habit     = trim($row['habitacion_cliente'] ?? '');
    $descripcionConsumo = trim($row['consumo_descripcion'] ?? '');
    $username  = $row['username'] ?? 'sistema';

    if ($monto <= 0) return;

    $descripcion = "Pago consumo hab/cliente {$habit} - {$descripcionConsumo} (Consumo #{$consumoId}, Pago #{$pagoId})";

    // 1) Insertar en area_movements como INGRESO
    try {
        $stmtIns = $pdo->prepare("
            INSERT INTO area_movements
            (user_id, fecha, area, tipo, origen, descripcion, monto, metodo_pago, turno, createdBy)
            VALUES
            (:user_id, :fecha, :area, :tipo, :origen, :descripcion, :monto, :metodo_pago, :turno, :createdBy)
        ");
        $stmtIns->execute([
            ':user_id'     => $userId > 0 ? $userId : null,
            ':fecha'       => substr($fecha, 0, 10), // YYYY-MM-DD
            ':area'        => $area,
            ':tipo'        => 'INGRESO',
            ':origen'      => 'CONSUMO',
            ':descripcion' => $descripcion,
            ':monto'       => $monto,
            ':metodo_pago' => $metodo,
            ':turno'       => '',        // si luego manejás turnos, podés cargarlo
            ':createdBy'   => $username,
        ]);
    } catch (Throwable $e) {
        // Para no romper el pago si falla area_movements, lo ignoramos
    }

    // 2) Enviar a la app de caja diaria (POST a add_entry.php)
    //    Ajustá campos si tu add_entry.php espera otros nombres
    try {
        $url = "https://cajadiaria.serviciosasturias.com/add_entry.php";

        $postData = [
            'source_system' => 'sistema_gestion_winebar',
            'user_id'       => $userId,
            'fecha'         => substr($fecha, 0, 10),
            'area'          => $area,
            'tipo'          => 'INGRESO',
            'origen'        => 'CONSUMO',
            'descripcion'   => $descripcion,
            'monto'         => $monto,
            'metodoPago'    => $metodo,
            'turno'         => '',
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
    } catch (Throwable $e) {
        // Ignorar errores de red para no romper el flujo
    }
}

try {
    $data = getRequestData();

    $userId  = (int)($data['user_id'] ?? 0);   // quién registra el pago
    $consumo = (int)($data['consumo_id'] ?? 0);
    $fecha   = trim($data['fecha'] ?? '');
    $metodo  = trim($data['metodo'] ?? '');
    $monto   = (float)($data['monto'] ?? 0);

    $hora    = trim($data['hora'] ?? '');
    $alias   = trim($data['alias_cbu'] ?? '');
    $banco   = trim($data['banco'] ?? '');
    $numOp   = trim($data['numero_operacion'] ?? '');
    $imgComp = trim($data['imagen_comprobante'] ?? '');

    requireActiveUser($pdo, $userId);

    if ($consumo <= 0 || $fecha === '' || $metodo === '' || $monto <= 0) {
        throw new Exception("Datos inválidos para registrar pago");
    }

    if (!in_array($metodo, ['EFECTIVO','TRANSFERENCIA','CARGAR_HABITACION'], true)) {
        throw new Exception("Método de pago inválido");
    }

    $pdo->beginTransaction();

    // ✅ NUEVO: Obtener datos del consumo para reducir stock
    $stmtCons = $pdo->prepare("
        SELECT area, consumo_descripcion, categoria, cantidad 
        FROM wb_consumos 
        WHERE id = :cid
    ");
    $stmtCons->execute([':cid' => $consumo]);
    $consumoData = $stmtCons->fetch(PDO::FETCH_ASSOC);

    // Insertar pago
    $stmt = $pdo->prepare("
        INSERT INTO wb_consumo_pagos
        (consumo_id, fecha, metodo, monto, usuario_registro_id,
         hora, alias_cbu, banco, numero_operacion, imagen_comprobante)
        VALUES
        (:consumo_id, :fecha, :metodo, :monto, :uid,
         :hora, :alias, :banco, :numop, :img)
    ");
    $stmt->execute([
        ':consumo_id' => $consumo,
        ':fecha'      => $fecha,
        ':metodo'     => $metodo,
        ':monto'      => $monto,
        ':uid'        => $userId,
        ':hora'       => $hora ?: null,
        ':alias'      => $alias ?: null,
        ':banco'      => $banco ?: null,
        ':numop'      => $numOp ?: null,
        ':img'        => $imgComp ?: null,
    ]);
    $pagoId = (int)$pdo->lastInsertId();

    // Actualizar wb_consumos: recalcular monto_pagado y estado
    $stmtSum = $pdo->prepare("SELECT SUM(monto) AS total_pagado FROM wb_consumo_pagos WHERE consumo_id = :cid");
    $stmtSum->execute([':cid' => $consumo]);
    $row = $stmtSum->fetch(PDO::FETCH_ASSOC);
    $totalPagado = (float)($row['total_pagado'] ?? 0);

    $stmtConsTotal = $pdo->prepare("SELECT total FROM wb_consumos WHERE id = :cid FOR UPDATE");
    $stmtConsTotal->execute([':cid' => $consumo]);
    $c = $stmtConsTotal->fetch(PDO::FETCH_ASSOC);
    if (!$c) {
        throw new Exception("Consumo no encontrado");
    }

    $totalConsumo = (float)$c['total'];
    $estado = 'PAGO_PARCIAL';
    if ($totalPagado <= 0) {
        $estado = 'CARGAR_HABITACION';
    } elseif ($totalPagado >= $totalConsumo) {
        $estado = 'PAGADO';
    }

    $stmtUpd = $pdo->prepare("
        UPDATE wb_consumos
        SET monto_pagado = :mp, estado = :estado
        WHERE id = :cid
    ");
    $stmtUpd->execute([
        ':mp'     => $totalPagado,
        ':estado' => $estado,
        ':cid'    => $consumo,
    ]);

    // ✅ NUEVO: Reducir stock si el pago completa el consumo y la categoría lo requiere
    $stockInfo = ['stock_reducido' => false];
    if ($consumoData && $estado === 'PAGADO') {
        $area = $consumoData['area'];
        $productoNombre = $consumoData['consumo_descripcion'];
        $categoria = $consumoData['categoria'];
        $cantidad = (float)$consumoData['cantidad'];

        if (shouldReduceStock($categoria)) {
            try {
                $stockInfo = reducirStock($pdo, $area, $productoNombre, $cantidad, $userId, $consumo);
            } catch (Throwable $stockErr) {
                // Si hay error de stock, hacer rollback
                $pdo->rollBack();
                throw $stockErr;
            }
        }
    }

    $pdo->commit();

    // Sincronizar con area_movements y caja diaria
    try {
        syncPagoToAreaMovementsAndCaja($pdo, $consumo, $pagoId);
    } catch (Throwable $syncErr) {
        // Si falla la sync, no rompemos el pago
    }

    $response = [
        'success'        => true,
        'pago_id'        => $pagoId,
        'consumo_id'     => $consumo,
        'monto_pagado'   => $totalPagado,
        'estado_actual'  => $estado,
        'stock_info'     => $stockInfo,
    ];

    // Agregar alerta si existe
    if (!empty($stockInfo['alerta'])) {
        $response['alerta_stock'] = $stockInfo['alerta'];
    }

    echo json_encode($response);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
