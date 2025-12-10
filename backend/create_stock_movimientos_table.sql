-- Crear tabla de historial de movimientos de stock
-- Si ya existe, eliminarla primero
DROP TABLE IF EXISTS wb_stock_movimientos;

CREATE TABLE wb_stock_movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_item_id INT NOT NULL,
  tipo ENUM('INGRESO', 'EGRESO', 'AJUSTE') NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  stock_anterior DECIMAL(10,2) NOT NULL,
  stock_nuevo DECIMAL(10,2) NOT NULL,
  motivo VARCHAR(255),
  consumo_id INT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_item (stock_item_id),
  INDEX idx_fecha (created_at),
  INDEX idx_consumo (consumo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
