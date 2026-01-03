<?php
/**
 * soft_delete_consumo.php
 * Marca un consumo como eliminado (soft delete)
 * Solo para administradores
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $consumoId = $data['consumo_id'] ?? null;
    $userId = $data['user_id'] ?? null;

    if (!$consumoId || !$userId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'consumo_id y user_id son requeridos'
        ]);
        exit;
    }

    // Verificar que el usuario es administrador
    $stmtUser = $pdo->prepare("SELECT role FROM wb_users WHERE id = :user_id");
    $stmtUser->execute([':user_id' => $userId]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user || $user['role'] !== 'ADMIN') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Solo administradores pueden eliminar consumos'
        ]);
        exit;
    }

    // Obtener información del consumo antes de eliminarlo
    $stmtConsumo = $pdo->prepare("
        SELECT ticket_id, total, consumo_descripcion 
        FROM wb_consumos 
        WHERE id = :id AND deleted_at IS NULL
    ");
    $stmtConsumo->execute([':id' => $consumoId]);
    $consumo = $stmtConsumo->fetch(PDO::FETCH_ASSOC);

    if (!$consumo) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Consumo no encontrado o ya eliminado'
        ]);
        exit;
    }

    $ticketId = $consumo['ticket_id'];
    $totalConsumo = (float)$consumo['total'];

    $pdo->beginTransaction();

    try {
        // Soft delete del consumo
        $stmtDelete = $pdo->prepare("
            UPDATE wb_consumos 
            SET deleted_at = NOW(), deleted_by = :user_id 
            WHERE id = :id
        ");
        $stmtDelete->execute([
            ':id' => $consumoId,
            ':user_id' => $userId
        ]);

        // Recalcular total del ticket (excluyendo eliminados)
        if ($ticketId) {
            $stmtTotalNuevo = $pdo->prepare("
                SELECT SUM(total) as total_nuevo 
                FROM wb_consumos 
                WHERE ticket_id = :ticket_id AND deleted_at IS NULL
            ");
            $stmtTotalNuevo->execute([':ticket_id' => $ticketId]);
            $rowTotal = $stmtTotalNuevo->fetch(PDO::FETCH_ASSOC);
            $totalNuevo = (float)($rowTotal['total_nuevo'] ?? 0);

            // Actualizar total del ticket
            $stmtUpdateTicket = $pdo->prepare("
                UPDATE wb_tickets 
                SET total = :total 
                WHERE id = :ticket_id
            ");
            $stmtUpdateTicket->execute([
                ':total' => $totalNuevo,
                ':ticket_id' => $ticketId
            ]);
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Consumo eliminado exitosamente',
            'consumo_eliminado' => [
                'id' => (int)$consumoId,
                'descripcion' => $consumo['consumo_descripcion'],
                'total' => $totalConsumo
            ],
            'ticket' => [
                'id' => (int)$ticketId,
                'nuevo_total' => $totalNuevo
            ]
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
