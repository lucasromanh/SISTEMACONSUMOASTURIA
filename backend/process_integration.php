<?php
// sync_to_hotel_cash.php
// Endpoint para sincronizar movimientos con el sistema de Caja Diaria del hotel
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

// URL del sistema externo de Caja Diaria
const HOTEL_CASH_API_URL = 'https://cajadiaria.serviciosasturias.com/save_area_movement.php';

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
    // === DEBUG LOGGING ===
    $debugFile = __DIR__ . '/debug_sync.txt';
    $log = function($msg) use ($debugFile) {
        file_put_contents($debugFile, date('Y-m-d H:i:s') . " - $msg\n", FILE_APPEND);
    };

    $data = getRequestData();
    $userId = (int)($data['user_id'] ?? 0);
    $area = isset($data['area']) ? trim($data['area']) : null;

    if ($userId <= 0) {
        throw new Exception("user_id inválido");
    }

    // Obtener información del usuario
    $stmtUser = $pdo->prepare("SELECT username FROM wb_users WHERE id = :id");
    $stmtUser->execute([':id' => $userId]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);
    $username = $user['username'] ?? 'Sistema';

    // 44: === 1. OBTENER MOVIMIENTOS NO SINCRONIZADOS ===
    $allMovements = [];
    
    // 1A. Movimientos de caja (area_movements)
    $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'area_movements'");
    $tableExists = $checkTableStmt->rowCount() > 0;
    
    if ($tableExists) {
        $sql = "SELECT id, fecha, area, tipo, origen, descripcion, monto, metodo_pago 
                FROM area_movements 
                WHERE sincronizado = 0";
        if ($area) {
            $sql .= " AND area = :area";
        }
        
        $log("Query 1A (Movements): $sql");
        if($area) $log("Params: area=$area");

        $stmt = $pdo->prepare($sql);
        $params = [];
        if ($area) $params[':area'] = $area;
        $stmt->execute($params);
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $log("Filas encontradas en 1A: " . count($rows));

        foreach ($rows as $row) {
            $allMovements[] = [
                'source' => 'area_movements',
                'id' => $row['id'],
                'fecha' => $row['fecha'],
                'area' => $row['area'],
                'tipo' => $row['tipo'],
                'origen' => $row['origen'],
                'descripcion' => $row['descripcion'],
                'monto' => (float)$row['monto'],
                'metodo_pago' => $row['metodo_pago']
            ];
        }
    }

    // 1B. Consumos (wb_consumos)
    // ✅ EVITAR DUPLICADOS: Si ya existe en area_movements (por el nuevo create_consumo), NO lo enviamos de nuevo
    $sql = "SELECT c.id, c.fecha, c.area, c.estado, c.consumo_descripcion, c.habitacion_cliente, 
                   c.total, c.metodo_pago 
            FROM wb_consumos c
            WHERE c.sincronizado = 0 
            AND NOT EXISTS (
                SELECT 1 FROM area_movements am 
                WHERE am.descripcion LIKE CONCAT('%(Consumo #', c.id, ')%')
            )";
    
    if ($area) {
        $sql .= " AND c.area = :area";
    }
    
    $log("Query 1B (Consumos): $sql");
    if($area) $log("Params: area=$area");

    $stmt = $pdo->prepare($sql);
    $params = [];
    if ($area) $params[':area'] = $area;
    $stmt->execute($params);
    
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $log("Filas encontradas en 1B: " . count($rows));

    foreach ($rows as $row) {
        $tipo = ($row['estado'] === 'PAGADO') ? 'INGRESO' : 'EGRESO';
        $descripcion = $row['consumo_descripcion'];
        if ($row['habitacion_cliente']) {
            $descripcion .= ' - ' . $row['habitacion_cliente'];
        }
        
        $allMovements[] = [
            'source' => 'wb_consumos',
            'id' => $row['id'],
            'fecha' => $row['fecha'],
            'area' => $row['area'],
            'tipo' => $tipo,
            'origen' => 'CONSUMO',
            'descripcion' => $descripcion,
            'monto' => (float)$row['total'],
            'metodo_pago' => $row['metodo_pago'] ?? 'EFECTIVO'
        ];
    }
    
    // ✅ ADICIONAL: Marcar como sincronizados los consumos que YA están en area_movements
    // para que dejen de aparecer en la lista de "Pendientes"
    $sqlMarkDupes = "UPDATE wb_consumos c 
                     SET sincronizado = 1, fecha_sincronizacion = NOW() 
                     WHERE c.sincronizado = 0 
                     AND EXISTS (
                        SELECT 1 FROM area_movements am 
                        WHERE am.descripcion LIKE CONCAT('%(Consumo #', c.id, ')%')
                     )";
    $affected = $pdo->exec($sqlMarkDupes);
    $log("Autocorrección duplicados: $affected filas marcadas como sincronizadas en wb_consumos");

    // 1C. Gastos (wb_gastos)
    $sql = "SELECT id, fecha, area, descripcion, monto 
            FROM wb_gastos 
            WHERE sincronizado = 0";
    if ($area) {
        $sql .= " AND area = :area";
    }
    
    $stmt = $pdo->prepare($sql);
    $params = [];
    if ($area) $params[':area'] = $area;
    $stmt->execute($params);
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $allMovements[] = [
            'source' => 'wb_gastos',
            'id' => $row['id'],
            'fecha' => $row['fecha'],
            'area' => $row['area'],
            'tipo' => 'EGRESO',
            'origen' => 'GASTO',
            'descripcion' => $row['descripcion'],
            'monto' => (float)$row['monto'],
            'metodo_pago' => null
        ];
    }


    
    $log("INICIO SINCRONIZACIÓN - UserID: $userId");

    // === 2. ENVIAR MOVIMIENTOS AL SISTEMA EXTERNO ===
    $syncedIds = [
        'area_movements' => [],
        'wb_consumos' => [],
        'wb_gastos' => []
    ];
    $syncedCount = 0;
    $errors = [];

    $log("Movimientos a procesar: " . count($allMovements));

    foreach ($allMovements as $movement) {
        // Preparar datos para el sistema externo
        $postData = [
            'user_id' => $userId,
            'fecha' => $movement['fecha'],
            'area' => $movement['area'],
            'tipo' => $movement['tipo'],
            'origen' => $movement['origen'],
            'descripcion' => $movement['descripcion'],
            'monto' => $movement['monto'],
            'metodoPago' => $movement['metodo_pago'] ?? 'EFECTIVO',
            'turno' => $username,
            'createdBy' => $username
        ];
        
        $log("Enviando item ID {$movement['id']} ({$movement['source']})");

        // Enviar al sistema externo via cURL
        $ch = curl_init(HOTEL_CASH_API_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        $log("Respuesta API external: Code $httpCode");
        if ($curlError) $log("Error CURL: $curlError");

        if ($httpCode === 200 && $response) {
            $result = json_decode($response, true);
            $log("Response body: " . substr($response, 0, 100));
            
            if ($result && $result['success']) {
                // Guardar ID para marcar como sincronizado
                $syncedIds[$movement['source']][] = $movement['id'];
                $syncedCount++;
                $log("✅ Sincronizado OK");
            } else {
                $errMsg = $result['message'] ?? 'Error desconocido';
                $errors[] = "Error en {$movement['source']} ID {$movement['id']}: $errMsg";
                $log("❌ Error API: $errMsg");
            }
        } else {
            $errors[] = "Error HTTP {$httpCode} en {$movement['source']} ID {$movement['id']}";
            $log("❌ Error HTTP: $httpCode");
        }
    }

    // === 3. MARCAR COMO SINCRONIZADOS ===
    $now = date('Y-m-d H:i:s');

    // Marcar area_movements
    if (!empty($syncedIds['area_movements'])) {
        $ids = implode(',', array_map('intval', $syncedIds['area_movements']));
        $pdo->exec("UPDATE area_movements 
                    SET sincronizado = 1, fecha_sincronizacion = '$now' 
                    WHERE id IN ($ids)");
        $log("UPDATE area_movements: IDs $ids");
    }

    // Marcar wb_consumos
    if (!empty($syncedIds['wb_consumos'])) {
        $ids = implode(',', array_map('intval', $syncedIds['wb_consumos']));
        $sql = "UPDATE wb_consumos 
                SET sincronizado = 1, fecha_sincronizacion = '$now' 
                WHERE id IN ($ids)";
        $affected = $pdo->exec($sql);
        $log("UPDATE wb_consumos: IDs $ids - Afectados: $affected");
    }

    // Marcar wb_gastos
    if (!empty($syncedIds['wb_gastos'])) {
        $ids = implode(',', array_map('intval', $syncedIds['wb_gastos']));
        $pdo->exec("UPDATE wb_gastos 
                    SET sincronizado = 1, fecha_sincronizacion = '$now' 
                    WHERE id IN ($ids)");
        $log("UPDATE wb_gastos: IDs $ids");
    }
    
    $log("FIN SINCRONIZACIÓN - Total sync: $syncedCount");

    // Respuesta
    echo json_encode([
        'success' => true,
        'synced' => $syncedCount,
        'total' => count($allMovements),
        'errors' => $errors,
        'message' => "$syncedCount movimientos sincronizados correctamente"
    ]);

} catch (Throwable $e) {
    http_response_code(400);
    if(isset($log)) $log("EXCEPTION: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'synced' => 0,
        'total' => 0,
        'message' => $e->getMessage(),
    ]);
}
