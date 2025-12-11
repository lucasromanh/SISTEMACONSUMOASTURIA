<?php
// get_stock_alerts.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

try {
    $area = $_GET['area'] ?? null;
    
    $sql = "
        SELECT 
            id,
            area,
            nombre,
            categoria,
            stock_actual,
            stock_minimo,
            unidad,
            CASE 
                WHEN stock_actual <= 0 THEN 'AGOTADO'
                WHEN stock_actual <= stock_minimo THEN 'BAJO'
                ELSE 'OK'
            END AS nivel_alerta
        FROM wb_stock_items
        WHERE stock_actual <= stock_minimo
    ";
    
    if ($area) {
        $sql .= " AND (area = :area OR area = 'GENERAL')";
    }
    
    $sql .= " ORDER BY 
        CASE 
            WHEN stock_actual <= 0 THEN 1
            WHEN stock_actual <= stock_minimo THEN 2
            ELSE 3
        END,
        stock_actual ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    if ($area) {
        $stmt->execute([':area' => $area]);
    } else {
        $stmt->execute();
    }
    
    $alertas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'alertas' => $alertas,
        'total' => count($alertas)
    ]);
    
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
