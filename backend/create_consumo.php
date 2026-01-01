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
    
    // 🐛 DEBUG CRÍTICO: Ver qué llega en metodo_pago ANTES de procesar
    error_log("🔍 CREATE_CONSUMO - RAW DATA metodo_pago: " . var_export($data['metodo_pago'] ?? 'NO DEFINIDO', true));
    error_log("🔍 CREATE_CONSUMO - RAW DATA completo: " . json_encode($data));
    
    // 🔍 ESCRIBIR DEBUG A ARCHIVO
    $debugFile = __DIR__ . '/debug_create_consumo.txt';
    file_put_contents($debugFile, 
        date('Y-m-d H:i:s') . " - metodo_pago recibido: " . var_export($data['metodo_pago'] ?? 'NO DEFINIDO', true) . "\n" .
        "Datos completos: " . json_encode($data, JSON_PRETTY_PRINT) . "\n\n",
        FILE_APPEND
    );
    
    $metodoPago = trim($data['metodo_pago'] ?? '');
    $montoPagado = isset($data['monto_pagado']) ? (float)$data['monto_pagado'] : null;
    
    // ✅ NUEVO: Recibir datos de tarjeta e imagen
    $datosTarjetaRaw = $data['datos_tarjeta'] ?? null;
    $imagenComprobante = trim($data['imagen_comprobante'] ?? '');
    
    // ✅ IMPORTANTE: Limpiar imagenComprobante de datos_tarjeta si existe
    $datosTarjeta = null;
    if ($datosTarjetaRaw) {
        $tarjetaArray = is_array($datosTarjetaRaw) ? $datosTarjetaRaw : json_decode($datosTarjetaRaw, true);
        if ($tarjetaArray) {
            // Remover imagenComprobante del JSON antes de guardar
            unset($tarjetaArray['imagenComprobante']);
            $datosTarjeta = json_encode($tarjetaArray);
        }
    }

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

    // 🐛 DEBUG: Log para verificar qué se va a guardar
    error_log("CREATE_CONSUMO DEBUG: metodoPago = " . var_export($metodoPago, true));
    error_log("CREATE_CONSUMO DEBUG: datosTarjeta = " . var_export($datosTarjeta, true));
    error_log("CREATE_CONSUMO DEBUG: imagenComprobante length = " . strlen($imagenComprobante));

    $total = $precio * $cantidad;

    $pdo->beginTransaction();

    try {
        // ✅ ACTUALIZADO: Insertar consumo con datos_tarjeta e imagen_comprobante
        // NOTA: Para tarjetas, NO guardamos imagen_comprobante en wb_consumos (se guarda solo en wb_consumo_pagos)
        $imagenParaConsumo = ($metodoPago === 'TARJETA_CREDITO') ? null : ($imagenComprobante ?: null);
        
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
            ':imagen_comprobante' => $imagenParaConsumo,
            ':uid'         => $userId,
            ':ticket_id'   => $ticketId ?: null,
        ]);
        
        $consumoId = (int)$pdo->lastInsertId();
        
        // 🐛 DEBUG CRÍTICO: Verificar qué se insertó REALMENTE en la BD
        $stmtVerify = $pdo->prepare("SELECT metodo_pago FROM wb_consumos WHERE id = :id");
        $stmtVerify->execute([':id' => $consumoId]);
        $verificacion = $stmtVerify->fetch(PDO::FETCH_ASSOC);
        
        error_log("✅ CREATE_CONSUMO - INSERT ejecutado. ID: {$consumoId}");
        error_log("✅ Variable \$metodoPago antes de INSERT: " . var_export($metodoPago, true));
        error_log("✅ Valor enviado al PDO: " . var_export($metodoPago ?: null, true));
        error_log("✅ Valor EN LA BD después de INSERT: " . var_export($verificacion['metodo_pago'] ?? 'NULL', true));
        
        file_put_contents($debugFile, 
            date('Y-m-d H:i:s') . " - metodo_pago insertado: " . var_export($metodoPago ?: null, true) . "\n" .
            "estado: {$estado}, montoPagado: {$montoPagado}\n" .
            "Verificación BD: " . var_export($verificacion['metodo_pago'] ?? 'NULL', true) . "\n\n",
            FILE_APPEND
        );

        // ✅ NUEVO: Si el consumo es PAGADO, crear registro en wb_consumo_pagos
        if ($estado === 'PAGADO' && $metodoPago && $montoPagado > 0) {
            // 🔍 DEBUG: Ver qué se va a guardar
            error_log("🔍 CREATE - Guardando wb_consumo_pagos:");
            error_log("  - consumo_id: {$consumoId}");
            error_log("  - metodo: {$metodoPago}");
            error_log("  - imagen_comprobante length: " . strlen($imagenComprobante));
            
            file_put_contents($debugFile, 
                date('Y-m-d H:i:s') . " - GUARDANDO wb_consumo_pagos\n" .
                "  - consumo_id: {$consumoId}\n" .
                "  - metodo: {$metodoPago}\n" .
                "  - imagen_comprobante length: " . strlen($imagenComprobante) . "\n",
                FILE_APPEND
            );
            
            $stmtPago = $pdo->prepare("
                INSERT INTO wb_consumo_pagos
                (consumo_id, fecha, metodo, monto, usuario_registro_id, datos_tarjeta, imagen_comprobante)
                VALUES
                (:consumo_id, :fecha, :metodo, :monto, :uid, :datos_tarjeta, :imagen_comprobante)
            ");
            $stmtPago->execute([
                ':consumo_id' => $consumoId,
                ':fecha' => $fecha,
                ':metodo' => $metodoPago,
                ':monto' => $montoPagado,
                ':uid' => $userId,
                ':datos_tarjeta' => $datosTarjeta,
                ':imagen_comprobante' => $imagenComprobante ?: null,
            ]);
            
            $pagoId = $pdo->lastInsertId();
            file_put_contents($debugFile, "  - pago_id insertado: {$pagoId}\n", FILE_APPEND);
            
            // ✅ NUEVO: Crear movimiento de caja para sincronización con Caja del Hotel
            // Solo para EFECTIVO, TRANSFERENCIA y TARJETA_CREDITO (no para CARGAR_HABITACION)
            if (in_array($metodoPago, ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_CREDITO'])) {
                $habitCliente = trim($habCli) ?: 'Cliente';
                $descripcionMov = "Pago consumo hab/cliente {$habitCliente} - {$desc} (Consumo #{$consumoId})";
                
                try {
                    $stmtMov = $pdo->prepare("
                        INSERT INTO area_movements
                        (user_id, fecha, area, tipo, origen, descripcion, monto, metodo_pago, turno, createdBy)
                        VALUES
                        (:user_id, :fecha, :area, :tipo, :origen, :descripcion, :monto, :metodo_pago, :turno, :createdBy)
                    ");
                    $stmtMov->execute([
                        ':user_id'     => $userId,
                        ':fecha'       => substr($fecha, 0, 10),
                        ':area'        => $area,
                        ':tipo'        => 'INGRESO',
                        ':origen'      => 'CONSUMO',
                        ':descripcion' => $descripcionMov,
                        ':monto'       => $montoPagado,
                        ':metodo_pago' => $metodoPago,
                        ':turno'       => '',
                        ':createdBy'   => 'sistema',
                    ]);
                } catch (Throwable $movErr) {
                    // Si falla el movimiento, no romper el consumo
                    error_log("⚠️ Error creando movimiento de caja: " . $movErr->getMessage());
                }
            }
        }

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
