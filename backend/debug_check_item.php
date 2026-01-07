<?php
// debug_check_item.php
header("Content-Type: text/plain");
require_once 'db.php';

$consumoId = 115;

echo "=== DIAGNÓSTICO PARA CONSUMO #$consumoId ===\n\n";

// 1. Ver el consumo en wb_consumos
$stmt = $pdo->prepare("SELECT * FROM wb_consumos WHERE id = ?");
$stmt->execute([$consumoId]);
$consumo = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$consumo) {
    echo "❌ NO EXISTE el consumo en wb_consumos.\n";
} else {
    echo "✅ CONSUMO ENCONTRADO:\n";
    print_r($consumo);
}

echo "\n--------------------------------\n\n";

// 2. Ver posibles movimientos vinculados en area_movements
echo "Buscando en area_movements con LIKE '%(Consumo #$consumoId)%':\n";
$stmt = $pdo->prepare("SELECT * FROM area_movements WHERE descripcion LIKE ?");
$stmt->execute(["%(Consumo #$consumoId)%"]);
$movements = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($movements) === 0) {
    echo "❌ NO HAY movimientos en area_movements para este consumo.\n";
} else {
    echo "✅ ENCONTRADOS " . count($movements) . " MOVIMIENTOS:\n";
    print_r($movements);
}

echo "\n--------------------------------\n\n";

// 3. Simular lógica de Process Integration (Query 1B)
echo "Probando Query 1B (Exclusión):\n";
$sql = "SELECT c.id FROM wb_consumos c
        WHERE c.id = $consumoId 
        AND NOT EXISTS (
            SELECT 1 FROM area_movements am 
            WHERE am.descripcion LIKE CONCAT('%(Consumo #', c.id, ')%')
        )";
$stmt = $pdo->query($sql);
$res = $stmt->fetch();

if ($res) {
    echo "🆗 La query 1B LO INCLUYE (No tiene duplicado).\n";
} else {
    echo "🚫 La query 1B LO EXCLUYE (Detecta duplicado).\n";
}
