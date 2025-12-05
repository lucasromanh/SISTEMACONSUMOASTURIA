# Base de Datos - Sistema de Consumos Hotel Asturias

## Descripción

Este archivo contiene el script SQL completo para crear la base de datos MySQL/MariaDB del Sistema de Consumos del Hotel Asturias, incluyendo:

- ✅ Usuarios por área y administrador
- ✅ Productos y precios por categoría
- ✅ Consumos con tickets autoincrementales por área
- ✅ Movimientos de caja (ingresos y egresos)
- ✅ Comprobantes de transferencia con imágenes
- ✅ Sincronización con sistema caja-guardian-control
- ✅ Áreas del hotel (Winne Bar, Barra Pileta, Restaurante, La Finca)

---

## Instrucciones de Instalación

### 1. Crear la Base de Datos

```sql
CREATE DATABASE IF NOT EXISTS hotel_asturias_consumos
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE hotel_asturias_consumos;
```

---

## Estructura de Tablas

### 2. Tabla de Usuarios

```sql
CREATE TABLE usuarios (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  displayName VARCHAR(100) NOT NULL,
  role ENUM('ADMIN', 'WINNE_BAR', 'BARRA_PILETA', 'FINCA', 'RESTAURANTE') NOT NULL,
  area ENUM('WINNE_BAR', 'BARRA_PILETA', 'FINCA', 'RESTAURANTE', 'TODAS') DEFAULT NULL,
  activo BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role),
  INDEX idx_area (area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. Tabla de Productos

```sql
CREATE TABLE productos (
  id VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  categoria ENUM('Bebidas', 'Comidas', 'Postres', 'Whisky', 'Licuados', 'Tragos', 'Otros') NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  area ENUM('WINNE_BAR', 'BARRA_PILETA', 'FINCA', 'RESTAURANTE', 'TODAS') NOT NULL,
  stockActual DECIMAL(10, 2) DEFAULT 0,
  stockMinimo DECIMAL(10, 2) DEFAULT 0,
  unidadMedida ENUM('UNIDAD', 'LITRO', 'KG', 'PORCION') DEFAULT 'UNIDAD',
  activo BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categoria (categoria),
  INDEX idx_area (area),
  INDEX idx_activo (activo),
  INDEX idx_stock_bajo (stockActual, stockMinimo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. Tabla de Consumos

```sql
CREATE TABLE consumos (
  id VARCHAR(50) PRIMARY KEY,
  numeroTicket INT NOT NULL,
  area ENUM('WINNE_BAR', 'BARRA_PILETA', 'FINCA', 'RESTAURANTE') NOT NULL,
  fecha DATE NOT NULL,
  habitacionOCliente VARCHAR(100) NOT NULL,
  consumoDescripcion VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precioUnitario DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  estado ENUM('CARGAR_HABITACION', 'PAGADO') NOT NULL DEFAULT 'CARGAR_HABITACION',
  metodoPago ENUM('EFECTIVO', 'TRANSFERENCIA') DEFAULT NULL,
  montoPagado DECIMAL(10, 2) DEFAULT NULL,
  usuarioRegistroId VARCHAR(50) NOT NULL,
  turno VARCHAR(100) DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuarioRegistroId) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_area (area),
  INDEX idx_fecha (fecha),
  INDEX idx_estado (estado),
  INDEX idx_numeroTicket_area (numeroTicket, area),
  INDEX idx_habitacion (habitacionOCliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. Tabla de Contadores de Tickets por Área

```sql
CREATE TABLE contadores_tickets (
  area ENUM('WINNE_BAR', 'BARRA_PILETA', 'FINCA', 'RESTAURANTE') PRIMARY KEY,
  ultimoNumero INT NOT NULL DEFAULT 0,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6. Tabla de Movimientos de Caja

```sql
CREATE TABLE movimientos_caja (
  id VARCHAR(50) PRIMARY KEY,
  area ENUM('WINNE_BAR', 'BARRA_PILETA', 'FINCA', 'RESTAURANTE') NOT NULL,
  fecha DATE NOT NULL,
  tipo ENUM('INGRESO', 'EGRESO') NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  descripcion TEXT NOT NULL,
  categoria VARCHAR(50) DEFAULT NULL,
  metodoPago ENUM('EFECTIVO', 'TRANSFERENCIA') DEFAULT NULL,
  origen ENUM('CONSUMO', 'MANUAL', 'OTRO') DEFAULT 'MANUAL',
  consumoId VARCHAR(50) DEFAULT NULL,
  numeroFactura VARCHAR(100) DEFAULT NULL,
  razonSocial VARCHAR(255) DEFAULT NULL,
  turno VARCHAR(100) DEFAULT NULL,
  usuarioRegistroId VARCHAR(50) NOT NULL,
  sincronizado BOOLEAN DEFAULT FALSE,
  fechaSincronizacion TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuarioRegistroId) REFERENCES usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (consumoId) REFERENCES consumos(id) ON DELETE SET NULL,
  INDEX idx_area (area),
  INDEX idx_fecha (fecha),
  INDEX idx_tipo (tipo),
  INDEX idx_sincronizado (sincronizado),
  INDEX idx_origen (origen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7. Tabla de Comprobantes de Transferencia

```sql
CREATE TABLE comprobantes_transferencia (
  id VARCHAR(50) PRIMARY KEY,
  movimientoId VARCHAR(50) NOT NULL,
  imagenBase64 LONGTEXT NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  numeroOperacion VARCHAR(100) DEFAULT NULL,
  banco VARCHAR(100) DEFAULT NULL,
  fechaTransferencia DATE DEFAULT NULL,
  observaciones TEXT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (movimientoId) REFERENCES movimientos_caja(id) ON DELETE CASCADE,
  INDEX idx_movimiento (movimientoId),
  INDEX idx_numero_operacion (numeroOperacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 8. Tabla de Sincronización (para caja-guardian-control)

```sql
CREATE TABLE sincronizacion_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  movimientoId VARCHAR(50) NOT NULL,
  sistemaDestino VARCHAR(100) DEFAULT 'caja-guardian-control',
  fechaSincronizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('EXITOSO', 'FALLIDO', 'PENDIENTE') NOT NULL,
  mensajeError TEXT DEFAULT NULL,
  datosEnviados JSON DEFAULT NULL,
  respuestaServidor JSON DEFAULT NULL,
  FOREIGN KEY (movimientoId) REFERENCES movimientos_caja(id) ON DELETE CASCADE,
  INDEX idx_movimiento (movimientoId),
  INDEX idx_estado (estado),
  INDEX idx_fecha (fechaSincronizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 9. Tabla de Movimientos de Stock

```sql
CREATE TABLE movimientos_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productoId VARCHAR(50) NOT NULL,
  tipo ENUM('ENTRADA', 'SALIDA', 'AJUSTE') NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL,
  stockAnterior DECIMAL(10, 2) NOT NULL,
  stockNuevo DECIMAL(10, 2) NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  consumoId VARCHAR(50) DEFAULT NULL,
  usuarioId VARCHAR(50) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productoId) REFERENCES productos(id) ON DELETE RESTRICT,
  FOREIGN KEY (consumoId) REFERENCES consumos(id) ON DELETE SET NULL,
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_producto (productoId),
  INDEX idx_tipo (tipo),
  INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Datos Iniciales

### 10. Insertar Usuarios por Defecto

```sql
-- Contraseñas hasheadas con bcrypt (todas son: password123 para el ejemplo)
-- En producción, debes cambiar estas contraseñas

INSERT INTO usuarios (id, username, password, displayName, role, area) VALUES
('admin-001', 'admin', '$2a$10$YourHashedPasswordHere', 'Administrador', 'ADMIN', 'TODAS'),
('winne-001', 'winnebar', '$2a$10$YourHashedPasswordHere', 'Winne Bar', 'WINNE_BAR', 'WINNE_BAR'),
('pileta-001', 'pileta', '$2a$10$YourHashedPasswordHere', 'Barra Pileta', 'BARRA_PILETA', 'BARRA_PILETA'),
('finca-001', 'finca', '$2a$10$YourHashedPasswordHere', 'La Finca', 'FINCA', 'FINCA'),
('resto-001', 'resto', '$2a$10$YourHashedPasswordHere', 'Restaurante', 'RESTAURANTE', 'RESTAURANTE');
```

### 10. Inicializar Contadores de Tickets

```sql
INSERT INTO contadores_tickets (area, ultimoNumero) VALUES
('WINNE_BAR', 0),
('BARRA_PILETA', 0),
('FINCA', 0),
('RESTAURANTE', 0);
```

### 11. Insertar Productos de Ejemplo

```sql
-- Winne Bar - Bebidas
INSERT INTO productos (id, nombre, categoria, precio, area) VALUES
('prod-wb-001', 'Coca Cola', 'Bebidas', 500.00, 'WINNE_BAR'),
('prod-wb-002', 'Sprite', 'Bebidas', 500.00, 'WINNE_BAR'),
('prod-wb-003', 'Fernet', 'Bebidas', 800.00, 'WINNE_BAR'),
('prod-wb-004', 'Cerveza Quilmes', 'Bebidas', 600.00, 'WINNE_BAR'),
('prod-wb-005', 'Vino Tinto Copa', 'Bebidas', 700.00, 'WINNE_BAR'),

-- Winne Bar - Whisky
('prod-wb-006', 'Johnnie Walker Red', 'Whisky', 1500.00, 'WINNE_BAR'),
('prod-wb-007', 'Chivas Regal', 'Whisky', 2000.00, 'WINNE_BAR'),
('prod-wb-008', 'Jack Daniels', 'Whisky', 1800.00, 'WINNE_BAR'),

-- Winne Bar - Tragos
('prod-wb-009', 'Mojito', 'Tragos', 1200.00, 'WINNE_BAR'),
('prod-wb-010', 'Daiquiri', 'Tragos', 1200.00, 'WINNE_BAR'),
('prod-wb-011', 'Piña Colada', 'Tragos', 1300.00, 'WINNE_BAR'),

-- Barra Pileta - Bebidas
('prod-bp-001', 'Agua Mineral', 'Bebidas', 300.00, 'BARRA_PILETA'),
('prod-bp-002', 'Jugo de Naranja', 'Bebidas', 450.00, 'BARRA_PILETA'),
('prod-bp-003', 'Cerveza Corona', 'Bebidas', 700.00, 'BARRA_PILETA'),

-- Barra Pileta - Licuados
('prod-bp-004', 'Licuado de Banana', 'Licuados', 650.00, 'BARRA_PILETA'),
('prod-bp-005', 'Licuado de Frutilla', 'Licuados', 650.00, 'BARRA_PILETA'),
('prod-bp-006', 'Licuado de Durazno', 'Licuados', 650.00, 'BARRA_PILETA'),

-- Barra Pileta - Comidas
('prod-bp-007', 'Hamburguesa Simple', 'Comidas', 1500.00, 'BARRA_PILETA'),
('prod-bp-008', 'Papas Fritas', 'Comidas', 800.00, 'BARRA_PILETA'),
('prod-bp-009', 'Sandwich de Miga', 'Comidas', 600.00, 'BARRA_PILETA'),

-- La Finca - Comidas
('prod-fn-001', 'Asado Completo', 'Comidas', 3500.00, 'FINCA'),
('prod-fn-002', 'Empanadas (docena)', 'Comidas', 2000.00, 'FINCA'),
('prod-fn-003', 'Choripán', 'Comidas', 800.00, 'FINCA'),
('prod-fn-004', 'Ensalada Mixta', 'Comidas', 900.00, 'FINCA'),

-- La Finca - Bebidas
('prod-fn-005', 'Vino de la Casa (botella)', 'Bebidas', 1500.00, 'FINCA'),
('prod-fn-006', 'Cerveza Artesanal', 'Bebidas', 800.00, 'FINCA'),

-- Restaurante - Comidas
('prod-rs-001', 'Bife de Chorizo', 'Comidas', 2800.00, 'RESTAURANTE'),
('prod-rs-002', 'Pollo al Horno', 'Comidas', 2200.00, 'RESTAURANTE'),
('prod-rs-003', 'Pasta Bolognesa', 'Comidas', 1800.00, 'RESTAURANTE'),
('prod-rs-004', 'Milanesa Napolitana', 'Comidas', 2000.00, 'RESTAURANTE'),

-- Restaurante - Postres
('prod-rs-005', 'Flan con Dulce de Leche', 'Postres', 700.00, 'RESTAURANTE'),
('prod-rs-006', 'Helado (3 bochas)', 'Postres', 600.00, 'RESTAURANTE'),
('prod-rs-007', 'Tiramisu', 'Postres', 900.00, 'RESTAURANTE');
```

---

## Procedimientos Almacenados

### 12. Procedimiento para Obtener Siguiente Número de Ticket

```sql
DELIMITER //

CREATE PROCEDURE obtener_siguiente_ticket(
  IN p_area VARCHAR(50),
  OUT p_numero_ticket INT
)
BEGIN
  -- Bloquear la fila para evitar concurrencia
  SELECT ultimoNumero INTO p_numero_ticket
  FROM contadores_tickets
  WHERE area = p_area
  FOR UPDATE;
  
  -- Incrementar el contador
  SET p_numero_ticket = p_numero_ticket + 1;
  
  -- Actualizar el contador
  UPDATE contadores_tickets
  SET ultimoNumero = p_numero_ticket
  WHERE area = p_area;
END //

DELIMITER ;
```

### 13. Procedimiento para Registrar Consumo con Ticket

```sql
DELIMITER //

CREATE PROCEDURE registrar_consumo(
  IN p_id VARCHAR(50),
  IN p_area VARCHAR(50),
  IN p_fecha DATE,
  IN p_habitacion VARCHAR(100),
  IN p_descripcion VARCHAR(255),
  IN p_categoria VARCHAR(50),
  IN p_cantidad INT,
  IN p_precio_unitario DECIMAL(10,2),
  IN p_total DECIMAL(10,2),
  IN p_estado VARCHAR(50),
  IN p_metodo_pago VARCHAR(50),
  IN p_monto_pagado DECIMAL(10,2),
  IN p_usuario_id VARCHAR(50),
  IN p_turno VARCHAR(100),
  OUT p_numero_ticket INT
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Obtener siguiente número de ticket
  CALL obtener_siguiente_ticket(p_area, p_numero_ticket);
  
  -- Insertar consumo
  INSERT INTO consumos (
    id, numeroTicket, area, fecha, habitacionOCliente,
    consumoDescripcion, categoria, cantidad, precioUnitario,
    total, estado, metodoPago, montoPagado, usuarioRegistroId, turno
  ) VALUES (
    p_id, p_numero_ticket, p_area, p_fecha, p_habitacion,
    p_descripcion, p_categoria, p_cantidad, p_precio_unitario,
    p_total, p_estado, p_metodo_pago, p_monto_pagado, p_usuario_id, p_turno
  );
  
  COMMIT;
END //

DELIMITER ;
```

---

## Vistas Útiles

### 14. Vista de Resumen de Caja por Área

```sql
CREATE VIEW vista_resumen_caja AS
SELECT 
  area,
  DATE(fecha) as fecha,
  SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END) as total_ingresos,
  SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END) as total_egresos,
  SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE -monto END) as balance,
  COUNT(CASE WHEN tipo = 'INGRESO' THEN 1 END) as cantidad_ingresos,
  COUNT(CASE WHEN tipo = 'EGRESO' THEN 1 END) as cantidad_egresos
FROM movimientos_caja
GROUP BY area, DATE(fecha);
```

### 15. Vista de Consumos Pendientes por Habitación

```sql
CREATE VIEW vista_consumos_pendientes AS
SELECT 
  habitacionOCliente,
  area,
  COUNT(*) as cantidad_consumos,
  SUM(total) as total_pendiente,
  MIN(fecha) as fecha_primer_consumo,
  MAX(fecha) as fecha_ultimo_consumo
FROM consumos
WHERE estado = 'CARGAR_HABITACION'
GROUP BY habitacionOCliente, area;
```

### 16. Vista de Movimientos Pendientes de Sincronización

```sql
CREATE VIEW vista_pendientes_sincronizacion AS
SELECT 
  m.*,
  u.displayName as usuario_nombre,
  c.numeroTicket,
  c.habitacionOCliente
FROM movimientos_caja m
LEFT JOIN usuarios u ON m.usuarioRegistroId = u.id
LEFT JOIN consumos c ON m.consumoId = c.id
WHERE m.sincronizado = FALSE AND m.tipo = 'INGRESO'
ORDER BY m.fecha DESC, m.createdAt DESC;
```

### 17. Vista de Productos con Stock Bajo

```sql
CREATE VIEW vista_productos_stock_bajo AS
SELECT 
  p.*,
  (p.stockMinimo - p.stockActual) as cantidad_faltante
FROM productos p
WHERE p.stockActual <= p.stockMinimo AND p.activo = TRUE
ORDER BY (p.stockMinimo - p.stockActual) DESC;
```

---

## Triggers

### 17. Trigger para Crear Movimiento de Caja al Pagar Consumo

```sql
DELIMITER //

CREATE TRIGGER after_consumo_pagado
AFTER UPDATE ON consumos
FOR EACH ROW
BEGIN
  -- Solo si cambió de CARGAR_HABITACION a PAGADO
  IF OLD.estado = 'CARGAR_HABITACION' AND NEW.estado = 'PAGADO' THEN
    INSERT INTO movimientos_caja (
      id, area, fecha, tipo, monto, descripcion, categoria,
      metodoPago, origen, consumoId, turno, usuarioRegistroId
    ) VALUES (
      CONCAT('mov-', NEW.id),
      NEW.area,
      NEW.fecha,
      'INGRESO',
      NEW.montoPagado,
      CONCAT('Pago consumo #', NEW.numeroTicket, ' - ', NEW.habitacionOCliente),
      NEW.categoria,
      NEW.metodoPago,
      'CONSUMO',
      NEW.id,
      NEW.turno,
      NEW.usuarioRegistroId
    );
  END IF;
END //

DELIMITER ;
```

### 19. Trigger para Actualizar Stock al Crear Consumo

```sql
DELIMITER //

CREATE TRIGGER after_consumo_insert_stock
AFTER INSERT ON consumos
FOR EACH ROW
BEGIN
  DECLARE v_producto_id VARCHAR(50);
  DECLARE v_stock_anterior DECIMAL(10,2);
  DECLARE v_stock_nuevo DECIMAL(10,2);
  
  -- Buscar el producto por nombre (asumiendo que consumoDescripcion es el nombre del producto)
  -- NOTA: Esto es una aproximación. En producción, deberías tener el productoId en la tabla consumos
  SELECT id, stockActual INTO v_producto_id, v_stock_anterior
  FROM productos
  WHERE nombre = NEW.consumoDescripcion
  LIMIT 1;
  
  -- Si se encontró el producto, actualizar stock
  IF v_producto_id IS NOT NULL THEN
    SET v_stock_nuevo = v_stock_anterior - NEW.cantidad;
    
    -- Actualizar stock del producto
    UPDATE productos
    SET stockActual = v_stock_nuevo
    WHERE id = v_producto_id;
    
    -- Registrar movimiento de stock
    INSERT INTO movimientos_stock (
      productoId, tipo, cantidad, stockAnterior, stockNuevo,
      motivo, consumoId, usuarioId
    ) VALUES (
      v_producto_id,
      'SALIDA',
      NEW.cantidad,
      v_stock_anterior,
      v_stock_nuevo,
      CONCAT('Consumo #', NEW.numeroTicket, ' - ', NEW.habitacionOCliente),
      NEW.id,
      NEW.usuarioRegistroId
    );
  END IF;
END //

DELIMITER ;
```

---

## Índices Adicionales para Optimización

```sql
-- Índices compuestos para consultas frecuentes
CREATE INDEX idx_consumos_area_fecha_estado ON consumos(area, fecha, estado);
CREATE INDEX idx_movimientos_area_fecha_tipo ON movimientos_caja(area, fecha, tipo);
CREATE INDEX idx_movimientos_sincronizado_tipo ON movimientos_caja(sincronizado, tipo);

-- Índice de texto completo para búsquedas
CREATE FULLTEXT INDEX idx_productos_nombre ON productos(nombre);
CREATE FULLTEXT INDEX idx_consumos_descripcion ON consumos(consumoDescripcion);
```

---

## Notas Importantes

### Seguridad
- ⚠️ Las contraseñas en el script son de ejemplo. **DEBES cambiarlas en producción**.
- ⚠️ Usa bcrypt o argon2 para hashear contraseñas antes de insertarlas.
- ⚠️ Configura usuarios de MySQL con permisos mínimos necesarios.

### Sincronización con caja-guardian-control
- Los movimientos marcados con `sincronizado = FALSE` se enviarán al sistema externo.
- El campo `datosEnviados` en `sincronizacion_log` guarda el JSON enviado.
- El campo `respuestaServidor` guarda la respuesta del servidor externo.

### Comprobantes de Transferencia
- Las imágenes se guardan en base64 en `imagenBase64` (LONGTEXT).
- Para imágenes muy grandes, considera usar almacenamiento externo (S3, etc.).

### Tickets Autoincrementales
- Cada área tiene su propio contador de tickets independiente.
- Los tickets se reinician manualmente si es necesario.
- El procedimiento `obtener_siguiente_ticket` maneja la concurrencia.

### Backup
```bash
# Backup completo
mysqldump -u root -p hotel_asturias_consumos > backup_$(date +%Y%m%d).sql

# Restaurar
mysql -u root -p hotel_asturias_consumos < backup_20250101.sql
```

---

## Conexión desde la Aplicación

### Ejemplo de conexión (Node.js/PHP)

```javascript
// Node.js con mysql2
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'hotel_user',
  password: 'your_password',
  database: 'hotel_asturias_consumos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

```php
// PHP con PDO
$pdo = new PDO(
  'mysql:host=localhost;dbname=hotel_asturias_consumos;charset=utf8mb4',
  'hotel_user',
  'your_password',
  [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
```

---

## Mantenimiento

### Limpiar logs antiguos de sincronización (opcional)
```sql
-- Eliminar logs de sincronización exitosos mayores a 90 días
DELETE FROM sincronizacion_log
WHERE estado = 'EXITOSO'
AND fechaSincronizacion < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### Resetear contador de tickets (inicio de año, por ejemplo)
```sql
UPDATE contadores_tickets SET ultimoNumero = 0 WHERE area = 'WINNE_BAR';
UPDATE contadores_tickets SET ultimoNumero = 0 WHERE area = 'BARRA_PILETA';
UPDATE contadores_tickets SET ultimoNumero = 0 WHERE area = 'FINCA';
UPDATE contadores_tickets SET ultimoNumero = 0 WHERE area = 'RESTAURANTE';
```
