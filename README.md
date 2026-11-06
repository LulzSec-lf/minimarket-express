# Minimarket Express

Sistema de gestión comercial para minimarket con punto de venta, inventario y control por roles.

## Estructura

- `frontend/`: React, Vite y Tailwind CSS.
- `backend/`: API REST con Node.js y Express.
- `database/`: esquema inicial para PostgreSQL.

## Roles

- `ADMIN`: administración completa.
- `CAJERO`: ventas, clientes y consulta de productos.
- `ALMACENISTA`: compras, inventario, productos, categorías y proveedores.

## Desarrollo local

Instala las dependencias desde cada aplicación:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Configura las variables de entorno del backend en `backend/.env` y prepara PostgreSQL usando `database/schema.sql`.

Inicia los servicios en terminales separadas:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

La API usa el puerto `4000` y Vite usa normalmente el puerto `5173`.

## Funciones principales

- Autenticación JWT y contraseñas con bcrypt.
- POS con pagos en efectivo, Yape y Plin.
- Lector de códigos de barras mediante Enter.
- Validación de stock en frontend y backend.
- Ticket imprimible de venta.
- Resumen de caja separado entre efectivo y pagos digitales.
- Inventario con ajustes y movimientos.
- Reportes administrativos de ventas, compras, caja, inventario y auditoría.
- Protección contra fuerza bruta, bloqueo temporal y rate limiting del login.
- Invalidación de tokens al cerrar sesión o desactivar usuarios.
- Interfaz POS optimizada para tablets y pantallas táctiles con Tailwind CSS y `@tailwindcss/forms`.
