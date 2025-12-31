<?php
// close_ticket.php - ACTUALIZADO PARA TARJETA DE CRÉDITO
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

// Helpers
function getRequestData(){
    $contentType=$_SERVER['CONTENT_TYPE']??'';
    if(stripos($contentType,'application/json')!==false){
        $raw=file_get_contents("php://input");
        return json_decode($raw,true)??[];
    }
    return $_POST;
}

function requireActiveUser(PDO $pdo, int $userId){
    if($userId<=0) throw new Exception("user_id inválido");
    $stmt=$pdo->prepare("SELECT is_active, username FROM wb_users WHERE id=:id");
    $stmt->execute([':id'=>$userId]);
    $u=$stmt->fetch(PDO::FETCH_ASSOC);
    if(!$u || !$u['is_active']) throw new Exception("Usuario inactivo o no encontrado");
    return $u;
}

try {
    $data = getRequestData();

    $userId   = (int)($data['user_id'] ?? 0);
    $ticketId = (int)($data['ticket_id'] ?? 0);
    $fechaC   = trim($data['fecha_cierre'] ?? '');
    $notas    = trim($data['notas_cierre'] ?? '');

    // ✅ ACTUALIZADO: Agregar total de tarjeta
    $totEfec  = (float)($data['total_efectivo'] ?? 0);
    $totTrans = (float)($data['total_transferencia'] ?? 0);
    $totTarjeta = (float)($data['total_tarjeta'] ?? 0);
    $totHab   = (float)($data['total_habitacion'] ?? 0);

    $user = requireActiveUser($pdo, $userId);

    if ($ticketId <= 0) {
        throw new Exception("ticket_id inválido");
    }

    // Obtener información del ticket
    $stmt = $pdo->prepare("SELECT area, turno FROM wb_tickets WHERE id = :id");
    $stmt->execute([':id' => $ticketId]);
    $ticket = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$ticket) {
        throw new Exception("Ticket no encontrado");
    }

    // ✅ ACTUALIZADO: Incluir tarjeta en el total
    $total = $totEfec + $totTrans + $totTarjeta + $totHab;
    
    // ✅ ACTUALIZADO: Lógica de método de pago con prioridad
    $metodoPago = 'EFECTIVO';
    if ($totTarjeta > 0) {
        $metodoPago = 'TARJETA_CREDITO';
    } elseif ($totTrans > 0) {
        $metodoPago = 'TRANSFERENCIA';
    } elseif ($totHab > 0) {
        $metodoPago = 'HABITACION';
    }

    // Actualizar ticket
    $stmt = $pdo->prepare("
        UPDATE wb_tickets
        SET estado = 'CERRADO',
            total = :total,
            metodo_pago = :metodo_pago,
            notas = :notas
        WHERE id = :id
    ");
    $stmt->execute([
        ':total'       => $total,
        ':metodo_pago' => $metodoPago,
        ':notas'       => $notas,
        ':id'          => $ticketId,
    ]);

    // ✅ ACTUALIZADO: Solo crear movimiento si NO existen consumos PAGADOS para este ticket
    // Si los consumos ya están PAGADOS, ya se crearon movimientos en wb_consumo_pagos
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM wb_consumos WHERE ticket_id = :tid AND estado = 'PAGADO'");
    $stmt->execute([':tid' => $ticketId]);
    $consumosPagados = (int)$stmt->fetchColumn();
    
    // Solo crear movimiento si no hay consumos pagados (flujo antiguo de cerrar ticket)
    if (($totEfec > 0 || $totTrans > 0 || $totTarjeta > 0) && $consumosPagados === 0) {
        $movimientoData = [
            'area' => $ticket['area'],
            'tipo' => 'INGRESO',
            'origen' => 'CONSUMO',
            'descripcion' => "Ticket #{$ticketId} - {$notas}",
            'monto' => $totEfec + $totTrans + $totTarjeta,
            'metodoPago' => $metodoPago,
            'turno' => $ticket['turno'] ?: $user['username'],
            'createdBy' => $user['username'],
        ];

        // Hacer POST a la API de caja diaria
        $ch = curl_init('https://cajadiaria.serviciosasturias.com/save_area_movement.php');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($movimientoData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            error_log("Error al crear movimiento de caja: HTTP $httpCode - $response");
        }
    }

    echo json_encode([
        'success'=>true,
    ]);
} catch (Throwable $e){
    http_response_code(400);
    echo json_encode([
        'success'=>false,
        'message'=>$e->getMessage(),
    ]);
}
