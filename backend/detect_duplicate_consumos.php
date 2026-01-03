<?php
/**
 * detect_duplicate_consumos.php
 * Detecta consumos duplicados en el sistema
 * Solo para administradores
 */
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
    // Buscar duplicados: mismo ticket, descripción, precio, cantidad, creados con menos de 5 minutos de diferencia
    $stmt = $pdo->prepare("
        SELECT 
            c1.id as id1,
            c2.id as id2,
            c1.ticket_id,
            c1.consumo_descripcion,
            c1.precio_unitario,
            c1.cantidad,
            c1.total,
            c1.created_at as created_at1,
            c2.created_at as created_at2,
            c1.estado as estado1,
            c2.estado as estado2,
            c1.metodo_pago as metodo_pago1,
            c2.metodo_pago as metodo_pago2,
            TIMESTAMPDIFF(SECOND, c1.created_at, c2.created_at) as segundos_diferencia
        FROM wb_consumos c1
        INNER JOIN wb_consumos c2 
            ON c1.ticket_id = c2.ticket_id
            AND c1.consumo_descripcion = c2.consumo_descripcion
            AND c1.precio_unitario = c2.precio_unitario
            AND c1.cantidad = c2.cantidad
            AND c1.id < c2.id
            AND ABS(TIMESTAMPDIFF(SECOND, c1.created_at, c2.created_at)) < 300
        WHERE c1.deleted_at IS NULL 
            AND c2.deleted_at IS NULL
        ORDER BY c1.ticket_id, c1.created_at DESC
    ");
    
    $stmt->execute();
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Agrupar por ticket
    $groupedDuplicates = [];
    foreach ($duplicates as $dup) {
        $ticketId = $dup['ticket_id'];
        
        if (!isset($groupedDuplicates[$ticketId])) {
            $groupedDuplicates[$ticketId] = [
                'ticket_id' => (int)$ticketId,
                'grupos' => []
            ];
        }
        
        $groupedDuplicates[$ticketId]['grupos'][] = [
            'consumo_descripcion' => $dup['consumo_descripcion'],
            'precio_unitario' => (float)$dup['precio_unitario'],
            'cantidad' => (float)$dup['cantidad'],
            'total' => (float)$dup['total'],
            'items' => [
                [
                    'id' => (int)$dup['id1'],
                    'created_at' => $dup['created_at1'],
                    'estado' => $dup['estado1'],
                    'metodo_pago' => $dup['metodo_pago1']
                ],
                [
                    'id' => (int)$dup['id2'],
                    'created_at' => $dup['created_at2'],
                    'estado' => $dup['estado2'],
                    'metodo_pago' => $dup['metodo_pago2'],
                    'es_mas_reciente' => true
                ]
            ],
            'segundos_diferencia' => (int)$dup['segundos_diferencia']
        ];
    }

    echo json_encode([
        'success' => true,
        'total_tickets_con_duplicados' => count($groupedDuplicates),
        'total_duplicados' => count($duplicates),
        'duplicados' => array_values($groupedDuplicates)
    ], JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
