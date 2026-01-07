<?php
// debug_dashboard_data.php - Debug endpoint to check what data is being returned
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
    // Get recent consumos
    $stmt = $pdo->query("
        SELECT 
            id, 
            fecha, 
            area, 
            habitacion_cliente, 
            consumo_descripcion, 
            total, 
            estado, 
            monto_pagado, 
            metodo_pago,
            created_at
        FROM wb_consumos 
        WHERE fecha >= '2026-01-06'
        ORDER BY id DESC 
        LIMIT 20
    ");
    
    $consumos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get summary by payment method
    $stmt2 = $pdo->query("
        SELECT 
            metodo_pago,
            COUNT(*) as count,
            SUM(monto_pagado) as total_monto_pagado,
            SUM(total) as total_total
        FROM wb_consumos 
        WHERE fecha >= '2026-01-06'
        GROUP BY metodo_pago
    ");
    
    $summary = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'consumos' => $consumos,
        'summary_by_payment_method' => $summary,
        'total_consumos' => count($consumos)
    ], JSON_PRETTY_PRINT);
    
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
