<?php
// backend/fix_day_sync.php
// Script para REPARAR los movimientos del día basándose en los consumos reales
header("Content-Type: text/plain");
header("Access-Control-Allow-Origin: *");
require_once 'db.php';

try {
    $today = date('Y-m-d');
    
    echo "=== REPARACIÓN DE MOVIMIENTOS DEL DÍA ($today) ===\n\n";

    // 1. Identificar basura (movimientos que no cuadran)
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) as count, SUM(monto) as total FROM area_movements WHERE origen='CONSUMO' AND fecha = :fecha");
    $stmtCheck->execute([':fecha' => $today]);
    $current = $stmtCheck->fetch(PDO::FETCH_ASSOC);
    echo "Estado actual en area_movements:\n";
    echo "- Cantidad: " . $current['count'] . "\n";
    echo "- Total: $" . number_format($current['total'], 2) . "\n\n";

    // 2. ELIMINAR movimientos automáticos de hoy para regenerarlos limpios
    echo "🧹 Eliminando movimientos de consumo del día en area_movements...\n";
    $stmtDel = $pdo->prepare("DELETE FROM area_movements WHERE origen='CONSUMO' AND fecha = :fecha");
    $stmtDel->execute([':fecha' => $today]);
    echo "✅ Eliminados " . $stmtDel->rowCount() . " registros.\n\n";

    // 3. REGENERAR desde wb_consumos (La fuente de verdad)
    echo "🔄 Regenerando movimientos desde wb_consumos...\n";
    
    // Seleccionamos solo PAGADOS del día
    $sqlInsert = "
        INSERT INTO area_movements 
        (user_id, fecha, area, tipo, origen, descripcion, monto, metodo_pago, turno, createdBy, sincronizado, fecha_sincronizacion)
        SELECT 
            c.usuario_registro_id, 
            DATE(c.fecha), 
            c.area, 
            'INGRESO', 
            'CONSUMO', 
            CONCAT(c.consumo_descripcion, ' (Consumo #', c.id, ')'), 
            c.monto_pagado, 
            c.metodo_pago, 
            'Mañana', -- Default, ya que no guardamos turno en consumo
            u.username, -- Nombre del usuario
            c.sincronizado,
            c.fecha_sincronizacion
        FROM wb_consumos c
        LEFT JOIN wb_users u ON c.usuario_registro_id = u.id
        WHERE DATE(c.fecha) = :fecha 
        AND c.estado = 'PAGADO'
    ";

    $stmtIns = $pdo->prepare($sqlInsert);
    $stmtIns->execute([':fecha' => $today]);
    
    $nuevos = $stmtIns->rowCount();
    echo "✅ Regenerados $nuevos movimientos correcos.\n\n";

    // 4. Verificación final
    $stmtCheck->execute([':fecha' => $today]);
    $final = $stmtCheck->fetch(PDO::FETCH_ASSOC);
    echo "=== ESTADO FINAL ===\n";
    echo "- Cantidad: " . $final['count'] . "\n";
    echo "- Total: $" . number_format($final['total'], 2) . "\n";
    echo "Status: REPARADO EXITOSAMENTE";

} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage();
}
?>
