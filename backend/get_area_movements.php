<?php
// get_area_movements.php
// Endpoint para obtener movimientos de caja incluyendo gastos como EGRESO
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: 0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

try {
    // Obtener parámetros de la petición
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    $area = isset($_GET['area']) ? trim($_GET['area']) : null;
    $from = isset($_GET['from']) ? trim($_GET['from']) : null;
    $to = isset($_GET['to']) ? trim($_GET['to']) : null;
    $sincronizado = isset($_GET['sincronizado']) ? (int)$_GET['sincronizado'] : null;

    // Construir query para movimientos de área
    $movementsQuery = "
        SELECT 
            id,
            fecha,
            area,
            tipo,
            origen,
            descripcion,
            monto,
            metodo_pago,
            user_id,
            created_at,
            sincronizado,
            fecha_sincronizacion,
            'M' as source
        FROM area_movements
        WHERE 1=1
    ";

    // Construir query para consumos
    // ✅ EVITAR DUPLICADOS: Si ya existe en area_movements, NO lo mostramos de nuevo
    $consumosQuery = "
        SELECT 
            id,
            fecha,
            area,
            CASE WHEN estado = 'PAGADO' THEN 'INGRESO' ELSE 'EGRESO' END as tipo,
            'CONSUMO' as origen,
            CONCAT(consumo_descripcion, ' - ', habitacion_cliente) as descripcion,
            total as monto,
            metodo_pago,
            usuario_registro_id as user_id,
            created_at,
            sincronizado,
            fecha_sincronizacion,
            'C' as source
        FROM wb_consumos c
        WHERE 1=1
        AND NOT EXISTS (
            SELECT 1 FROM area_movements am 
            WHERE am.descripcion LIKE CONCAT('%(Consumo #', c.id, ')%')
        )
    ";

    // Construir query para gastos (como movimientos EGRESO)
    $gastosQuery = "
        SELECT 
            id,
            fecha,
            area,
            'EGRESO' as tipo,
            'GASTO' as origen,
            descripcion,
            monto,
            NULL as metodo_pago,
            user_id,
            created_at,
            sincronizado,
            fecha_sincronizacion,
            'G' as source
        FROM wb_gastos
        WHERE 1=1
    ";

    $params = [];

    // Agregar filtros de fecha si existen
    if ($from && $to) {
        $movementsQuery .= " AND fecha BETWEEN :from AND :to";
        $consumosQuery .= " AND fecha BETWEEN :from AND :to";
        $gastosQuery .= " AND fecha BETWEEN :from AND :to";
        $params[':from'] = $from;
        $params[':to'] = $to;
    }

    // Agregar filtro de área si existe
    if ($area) {
        $movementsQuery .= " AND area = :area";
        $consumosQuery .= " AND area = :area";
        $gastosQuery .= " AND area = :area";
        $params[':area'] = $area;
    }

    // Agregar filtro de sincronizado si existe
    if ($sincronizado !== null) {
        $movementsQuery .= " AND sincronizado = :sincronizado";
        $consumosQuery .= " AND sincronizado = :sincronizado";
        $gastosQuery .= " AND sincronizado = :sincronizado";
        $params[':sincronizado'] = $sincronizado;
    }

    // Verificar si la tabla area_movements existe
    $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'area_movements'");
    $tableExists = $checkTableStmt->rowCount() > 0;

    // Construir query final
    if ($tableExists) {
        // Si existe la tabla de movimientos, combinar las tres queries
        $finalQuery = "($movementsQuery) UNION ALL ($consumosQuery) UNION ALL ($gastosQuery) ORDER BY fecha DESC, created_at DESC";
    } else {
        // Si no existe, combinar solo consumos y gastos
        $finalQuery = "($consumosQuery) UNION ALL ($gastosQuery) ORDER BY fecha DESC, created_at DESC";
    }

    // Ejecutar query
    $stmt = $pdo->prepare($finalQuery);
    $stmt->execute($params);
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Formatear los datos para asegurar tipos correctos
    $formattedEntries = array_map(function($entry) {
        // Usar el source del query para generar ID único
        $prefix = $entry['source'] . '-';
        
        return [
            'id' => $prefix . $entry['id'],
            'fecha' => $entry['fecha'],
            'area' => $entry['area'],
            'tipo' => $entry['tipo'],
            'origen' => $entry['origen'],
            'descripcion' => $entry['descripcion'],
            'monto' => (float)$entry['monto'],
            'metodo_pago' => $entry['metodo_pago'],
            'user_id' => isset($entry['user_id']) ? (int)$entry['user_id'] : null,
            'created_at' => $entry['created_at'],
            'sincronizado' => (bool)$entry['sincronizado'],
            'fecha_sincronizacion' => $entry['fecha_sincronizacion'],
            'source' => $entry['source']
        ];
    }, $entries);

    echo json_encode([
        'success' => true,
        'entries' => $formattedEntries,
    ], JSON_NUMERIC_CHECK);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'entries' => [],
        'message' => $e->getMessage(),
    ]);
}
