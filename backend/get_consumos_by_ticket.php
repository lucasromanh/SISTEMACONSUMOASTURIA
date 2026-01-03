<?php
/**
 * get_consumos_by_ticket.php
 * Endpoint de debugging para verificar todos los consumos de un ticket
 * y calcular el total correcto
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
    $ticket_id = $_GET['ticket_id'] ?? null;

    if (!$ticket_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ticket_id es requerido'
        ]);
        exit;
    }

    // Obtener información del ticket (sin fecha_apertura que no existe)
    $stmtTicket = $pdo->prepare("
        SELECT id, total, estado, metodo_pago, notas
        FROM wb_tickets
        WHERE id = :ticket_id
    ");
    $stmtTicket->execute([':ticket_id' => $ticket_id]);
    $ticket = $stmtTicket->fetch(PDO::FETCH_ASSOC);

    if (!$ticket) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Ticket no encontrado'
        ]);
        exit;
    }

    // Obtener todos los consumos del ticket
    $stmtConsumos = $pdo->prepare("
        SELECT 
            id,
            fecha,
            area,
            habitacion_cliente,
            consumo_descripcion,
            categoria,
            precio_unitario,
            cantidad,
            total,
            estado,
            metodo_pago,
            monto_pagado,
            usuario_registro_id,
            created_at
        FROM wb_consumos
        WHERE ticket_id = :ticket_id
        ORDER BY id ASC
    ");
    $stmtConsumos->execute([':ticket_id' => $ticket_id]);
    $consumos = $stmtConsumos->fetchAll(PDO::FETCH_ASSOC);

    // Calcular total desde los consumos
    $totalCalculado = 0;
    foreach ($consumos as $consumo) {
        $totalCalculado += (float)$consumo['total'];
    }

    // Verificar si hay discrepancia
    $totalTicket = (float)$ticket['total'];
    $hayDiscrepancia = abs($totalTicket - $totalCalculado) > 0.01; // Margen de error de 1 centavo

    // Preparar respuesta
    $response = [
        'success' => true,
        'ticket' => [
            'id' => (int)$ticket['id'],
            'total_en_bd' => $totalTicket,
            'estado' => $ticket['estado'],
            'metodo_pago' => $ticket['metodo_pago'],
            'notas' => $ticket['notas']
        ],
        'consumos' => array_map(function($c) {
            return [
                'id' => (int)$c['id'],
                'descripcion' => $c['consumo_descripcion'],
                'categoria' => $c['categoria'],
                'precio_unitario' => (float)$c['precio_unitario'],
                'cantidad' => (float)$c['cantidad'],
                'total' => (float)$c['total'],
                'estado' => $c['estado'],
                'metodo_pago' => $c['metodo_pago'],
                'monto_pagado' => $c['monto_pagado'] ? (float)$c['monto_pagado'] : null,
                'created_at' => $c['created_at']
            ];
        }, $consumos),
        'analisis' => [
            'total_consumos' => count($consumos),
            'total_calculado_desde_consumos' => $totalCalculado,
            'total_en_ticket' => $totalTicket,
            'diferencia' => $totalTicket - $totalCalculado,
            'hay_discrepancia' => $hayDiscrepancia,
            'porcentaje_diferencia' => $totalCalculado > 0 
                ? round((($totalTicket - $totalCalculado) / $totalCalculado) * 100, 2) 
                : 0
        ]
    ];

    if ($hayDiscrepancia) {
        $response['analisis']['alerta'] = '⚠️ El total en wb_tickets no coincide con la suma de consumos';
        
        // Sugerir posible causa
        if ($totalTicket > $totalCalculado) {
            $razon = $totalTicket / $totalCalculado;
            if (abs($razon - 2.0) < 0.01) {
                $response['analisis']['posible_causa'] = 'Total duplicado (exactamente el doble)';
            } else {
                $response['analisis']['posible_causa'] = 'Total mayor al esperado';
            }
        } else {
            $response['analisis']['posible_causa'] = 'Total menor al esperado (consumos no registrados o eliminados)';
        }
    } else {
        $response['analisis']['status'] = '✅ El total del ticket coincide con la suma de consumos';
    }

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
