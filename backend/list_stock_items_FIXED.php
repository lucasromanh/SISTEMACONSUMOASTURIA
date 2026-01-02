<?php
// list_stock_items.php (VERSIÓN CORREGIDA - incluye productos GENERAL)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

// Helper
function getRequestData() {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return $_GET;
    }
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

try {
    $data   = getRequestData();
    $userId = (int)($data['user_id'] ?? 0);
    $area   = trim($data['area'] ?? '');

    requireActiveUser($pdo, $userId);

    $sql    = "SELECT * FROM wb_stock_items WHERE 1=1";
    $params = [];

    // ✅ FIX CRÍTICO: Incluir productos del área específica Y del área GENERAL
    // Esto permite que cada área tenga sus productos específicos + los productos comunes
    if ($area !== '') {
        $sql .= " AND (area = :area OR area = 'GENERAL')";
        $params[':area'] = $area;
    }

    $sql .= " ORDER BY area, categoria, nombre";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'items'   => $rows,
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
