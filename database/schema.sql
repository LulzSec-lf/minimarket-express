CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(30) UNIQUE NOT NULL,
  estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol_id INTEGER NOT NULL REFERENCES roles(id),
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  documento VARCHAR(40),
  telefono VARCHAR(40),
  correo VARCHAR(160),
  direccion TEXT,
  estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(160) NOT NULL,
  documento VARCHAR(40),
  telefono VARCHAR(40),
  correo VARCHAR(160),
  direccion TEXT,
  estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(60) UNIQUE NOT NULL,
  codigo_barras VARCHAR(80) UNIQUE,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  imagen_url TEXT,
  unidad_medida VARCHAR(30) NOT NULL DEFAULT 'unidad',
  precio_compra NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
  precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER UNIQUE NOT NULL REFERENCES productos(id),
  cantidad_actual NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0),
  stock_minimo NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movimientos (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA','SALIDA','AJUSTE')),
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  stock_anterior NUMERIC(12,3) NOT NULL,
  stock_nuevo NUMERIC(12,3) NOT NULL,
  motivo TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  numero_documento VARCHAR(60),
  fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  observaciones TEXT,
  metodo_pago VARCHAR(20) NOT NULL DEFAULT 'EFECTIVO' CHECK (metodo_pago IN ('EFECTIVO','YAPE','PLIN')),
  usuario_id INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS detalle_ventas (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  proveedor_id INTEGER REFERENCES proveedores(id),
  numero_documento VARCHAR(60),
  fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  observaciones TEXT,
  usuario_id INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS detalle_compras (
  id SERIAL PRIMARY KEY,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(12,2) NOT NULL CHECK (costo_unitario >= 0),
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED
);

INSERT INTO roles (id, nombre) VALUES
  (1, 'ADMIN'), (2, 'CAJERO'), (3, 'ALMACENISTA')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO categorias (nombre) VALUES
  ('Bebidas'), ('Abarrotes'), ('Lácteos'), ('Limpieza'),
  ('Higiene personal'), ('Snacks y golosinas'), ('Conservas'),
  ('Panadería'), ('Otros')
ON CONFLICT (nombre) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos (nombre);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos (producto_id);
