
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const pool = require("./config/database");
const productosRoutes = require("./routes/productos.routes");
const inventarioRoutes = require("./routes/inventario.routes");
const proveedoresRoutes = require("./routes/proveedores.routes");
const comprasRoutes = require("./routes/compras.routes");
const ventasRoutes = require("./routes/ventas.routes");
const clientesRoutes = require("./routes/clientes.routes");
const authRoutes = require("./routes/auth.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const categoriasRoutes = require("./routes/categorias.routes");
const reportesRoutes = require("./routes/reportes.routes");
const { verificarToken, verificarRol } = require("./middlewares/auth.middleware");
const { registrarAuditoria } = require("./utils/audit");


const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigin = process.env.FRONTEND_URL;
    const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);

    if (origin === allowedOrigin || isLocalNetwork) return callback(null, true);
    return callback(new Error("Origen no permitido por CORS"));
  }
}));
app.disable("x-powered-by");
app.use(helmet());
app.use((req, res, next) => {
  res.on("finish", () => {
    if (!req.usuario || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
    registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: `${req.method} ${req.baseUrl || ""}${req.path}`,
      entidad: req.path.split("/")[1],
      detalles: { status: res.statusCode },
      ip: req.ip
    }).catch((error) => console.error("Error al registrar auditoría:", error));
  });
  next();
});

app.use("/api/productos", productosRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/inventario", verificarToken, verificarRol("ADMIN", "ALMACENISTA"), inventarioRoutes);
app.use("/api/proveedores", verificarToken, verificarRol("ADMIN", "ALMACENISTA"), proveedoresRoutes);
app.use("/api/compras", verificarToken, verificarRol("ADMIN", "ALMACENISTA"), comprasRoutes);
app.use("/api/ventas", verificarToken, verificarRol("ADMIN", "CAJERO"), ventasRoutes);
app.use("/api/clientes", verificarToken, verificarRol("ADMIN", "CAJERO"), clientesRoutes);
app.use("/api/reportes", verificarToken, verificarRol("ADMIN"), reportesRoutes);


app.get("/", (req, res) => {
  res.json({
    mensaje: "MINIMARKET EXPRESS API funcionando correctamente",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT current_database() AS database,
             version() AS version
    `);

    res.json({
      estado: "conectado",
      base_datos: result.rows[0].database,
      postgres: result.rows[0].version,
    });
  } catch (error) {
    console.error("Error de conexión:", error.message);

    res.status(500).json({
      estado: "error",
      mensaje: "No se pudo conectar con PostgreSQL",
    });
  }
});

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await pool.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT");
    await pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER NOT NULL DEFAULT 0");
    await pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMPTZ");
    await pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0");
    await pool.query(`CREATE TABLE IF NOT EXISTS auditoria (
      id BIGSERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      accion VARCHAR(80) NOT NULL,
      entidad VARCHAR(80),
      entidad_id INTEGER,
      detalles JSONB,
      ip VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(
      `UPDATE productos
       SET imagen_url = $1
       WHERE imagen_url IS NULL
         AND (codigo = 'BEB-0001' OR nombre ILIKE '%coca-cola%')`,
      ["https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80"]
    );
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo preparar la base de datos:", error.message);
    process.exitCode = 1;
  }
}

startServer();
