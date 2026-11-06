import { Component, useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import {
    AlertTriangle, Archive, Boxes, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, CupSoda,
    Banknote, ClipboardList, Cookie, FileText, FolderTree, HeartPulse, LayoutDashboard, LogOut, Menu, Milk, Package,
    Pencil, Plus, Printer, QrCode, Receipt, Search, ShoppingBasket, ShoppingCart, Smartphone, SprayCan, Truck, UserRound, Users, Wheat, X
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import api from "./services/api";
import { getStoredValue, setStoredValue } from "./services/storage";
import "./App.css";
import Login from "./pages/Login";

const menu = [
    { key: "dashboard", label: "Panel principal", icon: LayoutDashboard, group: "INICIO" },
    { key: "ventas", label: "Ventas y POS", icon: ShoppingCart, group: "OPERACIONES" },
    { key: "compras", label: "Compras", icon: Truck, group: "OPERACIONES" },
    { key: "inventario", label: "Inventario", icon: Boxes, group: "CATÁLOGO" },
    { key: "productos", label: "Productos", icon: Package, group: "CATÁLOGO" },
    { key: "categorias", label: "Categorías", icon: FolderTree, group: "CATÁLOGO" },
    { key: "clientes", label: "Clientes", icon: Users, group: "CONTACTOS" },
    { key: "proveedores", label: "Proveedores", icon: Truck, group: "CONTACTOS" },
    { key: "usuarios", label: "Usuarios y roles", icon: UserRound, group: "ADMINISTRACIÓN" }
];

const allowed = (role, key) => {
    if (key === "usuarios") return role === "ADMIN";
    if (role === "CAJERO") return ["dashboard", "ventas", "productos", "clientes"].includes(key);
    if (role === "ALMACENISTA") return ["dashboard", "compras", "inventario", "productos", "categorias", "proveedores"].includes(key);
    return true;
};

const formatDate = (value) => new Date(value).toLocaleDateString("es-PE");

const productImage = (product) => {
    if (product.imagen_url) return product.imagen_url;
    const name = product.nombre.toLowerCase();
    const defaults = [
        ["coca", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=240&q=80"],
        ["pepsi", "https://images.unsplash.com/photo-1629203849820-fdd70d49c38e?auto=format&fit=crop&w=240&q=80"],
        ["inca", "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=240&q=80"],
        ["agua", "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=240&q=80"],
        ["lays", "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=240&q=80"],
        ["dorito", "https://images.unsplash.com/photo-1600952841320-db92ec4047ca?auto=format&fit=crop&w=240&q=80"],
        ["oreo", "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=240&q=80"],
        ["gloria", "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=240&q=80"],
        ["leche", "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=240&q=80"],
        ["yogurt", "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=240&q=80"],
        ["pan", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=240&q=80"],
        ["frugos", "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=240&q=80"]
    ];
    return defaults.find(([keyword]) => name.includes(keyword))?.[1] || null;
};

function ProductImage({ product, className = "" }) {
    const image = productImage(product);
    return image
        ? <img src={image} alt="" className={`object-contain ${className}`} onError={(event) => { event.currentTarget.style.display = "none"; }} />
        : <Package className="text-[#18865b]" size={22} />;
}

function PrivateRoute({ children }) {
    const { token, loading } = useAuth();
    if (loading) {
        return <div className="flex min-h-screen min-h-[100svh] items-center justify-center bg-[#f5f7fa] text-sm font-semibold text-[#18865b]">Verificando sesión...</div>;
    }
    return token ? children : <Navigate to="/login" replace />;
}

class AppErrorBoundary extends Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        console.error("Error al renderizar la aplicación:", error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen min-h-[100svh] items-center justify-center bg-[#f5f7fa] p-5 text-center">
                    <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                        <h1 className="text-lg font-bold text-[#14243a]">No se pudo cargar el panel</h1>
                        <p className="mt-2 text-sm text-slate-500">Recarga la página. Si continúa, cierra sesión y vuelve a ingresar.</p>
                        <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white">Recargar</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function Dashboard() {
    const { user, logout } = useAuth();
    const [active, setActive] = useState(() => {
        const savedModule = getStoredValue("minimarket.activeModule");
        return savedModule && allowed(user?.rol, savedModule) ? savedModule : "dashboard";
    });
    const [collapsed, setCollapsed] = useState(false);
    const [mobile, setMobile] = useState(false);
    const visibleMenu = menu.filter((item) => allowed(user?.rol, item.key));
    const current = menu.find((item) => item.key === active) || menu[0];
    const go = (key) => {
        if (!allowed(user?.rol, key)) return;
        setActive(key);
        setStoredValue("minimarket.activeModule", key);
        setMobile(false);
    };
    const groups = [...new Set(visibleMenu.map((item) => item.group))];

    return (
        <div className="flex h-screen h-[100svh] overflow-hidden bg-[#f5f7fa] text-[#14243a]">
            <button aria-label={mobile ? "Cerrar navegación" : "Abrir navegación"} aria-expanded={mobile} className="fixed right-4 top-4 z-40 rounded-xl bg-[#14243a] p-2.5 text-white shadow-lg lg:hidden" onClick={() => setMobile(!mobile)}>
                {mobile ? <X size={20} /> : <Menu size={20} />}
            </button>
            {mobile && <button aria-label="Cerrar menú" className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden" onClick={() => setMobile(false)} />}
            <aside className={`${mobile ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-[88px]" : "lg:w-[260px]"} fixed inset-y-0 left-0 z-30 flex h-[100svh] w-[min(280px,calc(100vw-1rem))] min-w-0 shrink-0 flex-col overflow-visible bg-[#14243a] px-4 py-5 text-white shadow-2xl transition-[width,transform] duration-300 lg:sticky lg:top-0 lg:h-[100svh] lg:translate-x-0 lg:relative`}>
                <div className={`mb-8 flex items-center gap-3 border-b border-white/10 pb-6 ${collapsed ? "lg:justify-center" : ""}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#18865b] shadow-lg shadow-emerald-950/30"><ShoppingCart size={21} /></div>
                    {!collapsed && <div><p className="font-bold tracking-tight">Minimarket Express</p><p className="text-[11px] text-slate-400">Gestión comercial</p></div>}
                </div>
                <div className="sidebar-scroll min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-contain">
                    {groups.map((group) => <div key={group}><p className={`mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-500 ${collapsed ? "lg:hidden" : ""}`}>{group}</p>{visibleMenu.filter((item) => item.group === group).map(({ key, label, icon: Icon }) => <button key={key} title={collapsed ? label : undefined} onClick={() => go(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active === key ? "bg-[#18865b] font-semibold text-white shadow-lg shadow-emerald-950/20" : "text-slate-300 hover:bg-white/10 hover:text-white"} ${collapsed ? "lg:justify-center" : ""}`}><Icon size={18} />{!collapsed && <span>{label}</span>}</button>)}</div>)}
                </div>
                <div className={`mt-5 border-t border-white/10 pt-4 ${collapsed ? "lg:text-center" : ""}`}><div className={`mb-3 flex items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}><div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-emerald-300">{user?.nombre?.charAt(0)?.toUpperCase()}</div>{!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.nombre}</p><p className="text-[11px] text-slate-400">{user?.rol}</p></div>}</div><button onClick={logout} title={collapsed ? "Cerrar sesión" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-red-400/10 hover:text-red-300 ${collapsed ? "lg:justify-center" : ""}`}><LogOut size={17} />{!collapsed && "Cerrar sesión"}</button></div>
                <button aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"} onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-20 z-40 hidden rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-md transition hover:bg-slate-50 lg:block">{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
            </aside>
            <main className="scrollbar-none h-screen h-[100svh] min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#f5f7fa] [-webkit-overflow-scrolling:touch]">
                <header className="border-b border-slate-200 bg-white px-5 py-5 lg:px-10"><p className="text-xs font-semibold uppercase tracking-wider text-[#18865b]">{current.group}</p><h1 className="mt-1 text-xl font-bold">{current.label}</h1></header>
                <section className="p-4 sm:p-5 lg:p-8 xl:p-10">{active === "dashboard" && <Home onOpen={go} />}{active === "ventas" && <PointOfSale />}{active === "productos" && <Products />}{active === "categorias" && <Categories />}{active === "inventario" && <Inventory />}{active === "usuarios" && <UsersModule />}{active === "compras" && <Purchases />}{active === "clientes" && <Clients />}{active === "proveedores" && <Suppliers />}</section>
            </main>
        </div>
    );
}

function Home({ onOpen }) {
    const { user } = useAuth();
    const canSell = allowed(user?.rol, "ventas");
    const inventoryTarget = allowed(user?.rol, "inventario") ? "inventario" : "productos";
    const [stats, setStats] = useState({ productos: 0, categorias: 0, ventas: 0, compras: 0 });
    const [sales, setSales] = useState([]);
    const [allSales, setAllSales] = useState([]);
    const [activity, setActivity] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => {
        const requests = [
            api.get("/productos"),
            api.get("/categorias"),
            user?.rol === "ALMACENISTA" ? null : api.get("/ventas"),
            user?.rol === "CAJERO" ? null : api.get("/compras")
        ];
        Promise.all(requests).then(([p, c, v, co]) => {
        const products = p.data;
        const categories = c.data;
        const salesData = v?.data || [];
        const purchasesData = co?.data || [];
        setStats({ productos: products.filter((item) => item.estado !== false).length, categorias: categories.filter((item) => item.estado !== false).length, ventas: salesData.length, compras: purchasesData.length });
        setAllSales(salesData);
        setSales(salesData.slice(0, 5));
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));
            return { date, label: date.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "").slice(0, 2), total: 0 };
        });
        salesData.forEach((sale) => {
            const saleDate = new Date(sale.fecha);
            const day = days.find((item) => item.date.toDateString() === saleDate.toDateString());
            if (day && sale.estado !== "ANULADA") day.total += Number(sale.total) || 0;
        });
        setActivity(days);
        }).catch((e) => setError(e.response?.data?.mensaje || "No se pudo cargar el resumen del negocio"));
    }, [user?.rol]);
    const maxActivity = Math.max(...activity.map((day) => day.total), 1);
    const paymentLabels = { EFECTIVO: "Efectivo", YAPE: "Yape", PLIN: "Plin" };
    const cashSummary = allSales.reduce((summary, sale) => {
        if (sale.estado === "ANULADA") return summary;
        const total = Number(sale.total) || 0;
        if (sale.metodo_pago === "EFECTIVO") summary.efectivo += total;
        if (sale.metodo_pago === "YAPE") summary.yape += total;
        if (sale.metodo_pago === "PLIN") summary.plin += total;
        return summary;
    }, { efectivo: 0, yape: 0, plin: 0 });
    const digitalTotal = cashSummary.yape + cashSummary.plin;
    const cards = [
        ["ventas", "Ventas registradas", stats.ventas, CircleDollarSign, "text-[#18865b]", "bg-emerald-50"],
        ["productos", "Productos activos", stats.productos, Package, "text-blue-600", "bg-blue-50"],
        ["categorias", "Categorías", stats.categorias, FolderTree, "text-violet-600", "bg-violet-50"],
        ["compras", "Compras registradas", stats.compras, ClipboardList, "text-amber-600", "bg-amber-50"]
    ].filter(([key]) => allowed(user?.rol, key));
    return <div className="mx-auto max-w-[1500px]">{error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-semibold text-[#18865b]">Resumen general</p><h2 className="text-3xl font-bold tracking-tight text-[#14243a]">Buenos días, revisemos tu negocio</h2><p className="mt-2 text-sm text-slate-500">Aquí tienes una visión rápida de la operación.</p></div><button onClick={() => onOpen(canSell ? "ventas" : inventoryTarget)} className="flex items-center justify-center gap-2 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-800/20 hover:bg-[#126b47]">{canSell ? <ShoppingCart size={17} /> : <Boxes size={17} />} {canSell ? "Nueva venta" : "Ver inventario"}</button></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([key, label, value, Icon, color, bg]) => <button key={key} onClick={() => onOpen(key)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div className={`rounded-xl p-2.5 ${bg} ${color}`}><Icon size={21} /></div><span className="text-xs font-semibold text-slate-400">Actual</span></div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-[#14243a]">{value}</p></button>)}</div>
        {canSell && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="font-bold">Resumen de caja</h3><p className="mt-1 text-xs text-slate-500">Ventas registradas en esta sesión de consulta, excluyendo anuladas.</p></div><span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-[#18865b]">Digital: S/ {digitalTotal.toFixed(2)}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">Efectivo en cajón</p><p className="mt-1 text-xl font-bold text-emerald-900">S/ {cashSummary.efectivo.toFixed(2)}</p></div><div className="rounded-xl bg-violet-50 p-4"><p className="text-xs font-semibold text-violet-700">Yape</p><p className="mt-1 text-xl font-bold text-violet-900">S/ {cashSummary.yape.toFixed(2)}</p></div><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-700">Plin</p><p className="mt-1 text-xl font-bold text-blue-900">S/ {cashSummary.plin.toFixed(2)}</p></div></div></div>}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-bold">Actividad de ventas</h3><p className="mt-1 text-xs text-slate-500">Ingresos diarios de los últimos 7 días</p></div><span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-[#18865b]">S/ {activity.reduce((sum, day) => sum + day.total, 0).toFixed(2)}</span></div>{activity.length ? <div className="mt-6 flex h-48 items-end gap-2 border-b border-slate-100 px-2">{activity.map((day) => <div key={day.date.toISOString()} className="group flex min-w-0 flex-1 flex-col items-center gap-2" title={`S/ ${day.total.toFixed(2)}`}><div className="w-full max-w-[34px] rounded-t-md bg-[#18865b]/80 transition group-hover:bg-[#18865b]" style={{ height: `${Math.max((day.total / maxActivity) * 100, day.total ? 8 : 2)}%` }} /><span className="text-[10px] uppercase text-slate-400">{day.label}</span></div>)}</div> : <div className="flex h-48 items-center justify-center text-sm text-slate-400">Cargando actividad...</div>}</div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-bold">Últimas ventas</h3><button onClick={() => onOpen("ventas")} className="text-xs font-semibold text-[#18865b]">Ver todas</button></div><div className="mt-4 space-y-3">{sales.length ? sales.map((sale) => <div key={sale.id} className="flex items-center justify-between rounded-xl bg-[#f5f7fa] p-3"><div><p className="text-sm font-semibold">Venta #{sale.id}</p><p className="text-xs text-slate-500">{sale.numero_documento || "Sin documento"}</p><p className="mt-1 text-[11px] text-slate-500">{paymentLabels[sale.metodo_pago] || "Pago no indicado"}</p></div><div className="text-right"><p className="text-sm font-bold">S/ {Number(sale.total || 0).toFixed(2)}</p><p className="text-[11px] text-[#18865b]">{sale.estado}</p></div></div>) : <p className="py-8 text-center text-sm text-slate-400">No hay ventas registradas</p>}</div></div></div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><AlertTriangle size={20} className="shrink-0 text-amber-600" /><div><p className="text-sm font-semibold">Revisa tu inventario</p><p className="text-xs text-amber-700">Consulta existencias y productos que necesitan reposición.</p></div><button onClick={() => onOpen(inventoryTarget)} className="ml-auto whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm">{allowed(user?.rol, "inventario") ? "Ver inventario" : "Ver productos"}</button></div>
    </div>;
}

function Products() {
    const { user } = useAuth();
    const canEdit = user?.rol === "ADMIN" || user?.rol === "ALMACENISTA";
    const emptyForm = { codigo: "", codigo_barras: "", nombre: "", descripcion: "", imagen_url: "", categoria_id: "", unidad_medida: "unidad", precio_compra: 0, precio_venta: 0, stock_minimo: 0, stock: 0 };
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [imageError, setImageError] = useState("");
    const [confirmProduct, setConfirmProduct] = useState(null);
    const load = () => api.get("/productos").then((r) => setItems(r.data)).catch((e) => setError(e.response?.data?.mensaje || "No se pudieron cargar los productos"));
    useEffect(() => { load(); api.get("/categorias").then((r) => setCategories(r.data.filter((item) => item.estado))).catch((e) => setError(e.response?.data?.mensaje || "No se pudieron cargar las categorías")); }, []);
    const filtered = items.filter((p) => `${p.nombre} ${p.codigo} ${p.codigo_barras || ""}`.toLowerCase().includes(query.toLowerCase()) && (!category || String(p.categoria_id) === category));
    const closeModal = () => { setModalOpen(false); setEditing(null); };
    const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setError(""); setImageError(""); setModalOpen(true); };
    const openEdit = (product) => { setEditing(product); setForm({ ...emptyForm, ...product, imagen_url: product.imagen_url || "", categoria_id: product.categoria_id || "", stock_minimo: product.stock_minimo || 0, stock: product.stock || 0 }); setError(""); setImageError(""); setModalOpen(true); };
    const handleImageFile = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setImageError("Selecciona un archivo de imagen válido.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const image = new Image();
            image.onload = () => {
                const maxSide = 800;
                const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
                setForm((current) => ({ ...current, imagen_url: canvas.toDataURL("image/jpeg", 0.82) }));
                setImageError("");
            };
            image.onerror = () => setImageError("No se pudo leer la imagen seleccionada.");
            image.src = reader.result;
        };
        reader.onerror = () => setImageError("No se pudo cargar la imagen.");
        reader.readAsDataURL(file);
    };
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        const payload = { ...form, categoria_id: form.categoria_id || null, imagen_url: form.imagen_url.trim() || null, stock_inicial: editing ? undefined : Number(form.stock) || 0 };
        try {
            if (editing) {
                await api.put(`/productos/${editing.id}`, payload);
                if (Number(form.stock) !== Number(editing.stock)) {
                    await api.post("/inventario/movimientos", { producto_id: editing.id, tipo: "AJUSTE", cantidad: Number(form.stock), motivo: "Ajuste desde catálogo de productos" });
                }
            } else await api.post("/productos", payload);
            closeModal();
            setForm(emptyForm);
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo guardar el producto");
        } finally {
            setSaving(false);
        }
    };
    const deactivateProduct = async () => {
        if (!confirmProduct) return;
        try {
            await api.delete(`/productos/${confirmProduct.id}`);
            setMessage("Producto desactivado correctamente");
            setConfirmProduct(null);
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo desactivar el producto");
        }
    };
    const lowStock = items.filter((item) => Number(item.stock) <= Number(item.stock_minimo)).length;
    const money = (value) => `S/ ${Number(value || 0).toFixed(2)}`;
    return <Resource title="Catálogo de Productos" subtitle="Administra productos, precios, existencias e imágenes." error={error}>
        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-[#126b47]">{message}</div>}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o código..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#18865b]" /></div>
            {canEdit && <button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#126b47]"><Plus size={17} /> Nuevo producto</button>}
        </div>
        <div className="mb-5 grid gap-4 md:grid-cols-3">
            {[["Total en catálogo", items.length, "bg-white", "text-[#14243a]"], ["Stock bajo", lowStock, "bg-amber-50", "text-amber-700"], ["Categorías activas", categories.length, "bg-violet-50", "text-violet-700"]].map(([label, value, bg, color]) => <div key={label} className={`flex items-center justify-between rounded-2xl border border-slate-200 p-5 shadow-sm ${bg}`}><div><p className="text-sm text-slate-500">{label}</p><p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p></div><span className={`rounded-lg px-3 py-2 text-sm font-bold ${color} bg-white/70`}>{value}</span></div>)}
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar productos..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#18865b]" /></div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#18865b]"><option value="">Todas las categorías</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-100 bg-[#f8fafc] text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Foto", "SKU", "Producto", "Categoría", "Costo", "Precio venta", "Existencias", "Estado", "Acciones"].map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.length ? filtered.map((product) => { const low = Number(product.stock) <= Number(product.stock_minimo); return <tr key={product.id} className="transition hover:bg-emerald-50/30"><td className="px-4 py-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50"><ProductImage product={product} className="h-10 w-10" /></div></td><td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{product.codigo}</span></td><td className="max-w-[220px] px-4 py-3 font-semibold text-[#14243a]">{product.nombre}<p className="mt-1 text-xs font-normal text-slate-400">Mín. {Number(product.stock_minimo).toLocaleString("es-PE")}</p></td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{product.categoria || "Sin categoría"}</span></td><td className="px-4 py-3 text-slate-600">{money(product.precio_compra)}</td><td className="px-4 py-3 font-bold text-[#14243a]">{money(product.precio_venta)}</td><td className="px-4 py-3 font-semibold">{Number(product.stock).toLocaleString("es-PE")}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{low ? "Stock bajo" : "Normal"}</span></td><td className="px-4 py-3">{canEdit && <button onClick={() => openEdit(product)} title="Editar producto" className="rounded-lg p-2 text-slate-600 hover:bg-emerald-50 hover:text-[#18865b]">        <Pencil size={16} /></button>}{product.estado && <button onClick={() => setConfirmProduct(product)} title="Desactivar producto" className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"><X size={16} /></button>}</td></tr>; }) : <tr><td colSpan="9" className="px-5 py-14 text-center text-slate-400">No hay productos para mostrar</td></tr>}</tbody></table></div>
        {canEdit && modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-[#14243a]">{editing ? "Editar producto" : "Nuevo producto"}</h3><p className="text-sm text-slate-500">Completa la información del catálogo.</p></div><button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>        <div className="grid gap-4 sm:grid-cols-2">{[["codigo", "SKU / Código", true], ["codigo_barras", "Código de barras", false], ["nombre", "Nombre del producto", true], ["precio_compra", "Precio de costo", true], ["precio_venta", "Precio de venta", true], ["stock", "Existencias actuales", true], ["stock_minimo", "Stock mínimo", true]].map(([key, label, required]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}{required && " *"}<input required={required}         type={["precio_compra", "precio_venta", "stock", "stock_minimo"].includes(key) ? "number" : "text"} step="0.01" value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18865b]" /></label>)}<label className="text-xs font-semibold text-slate-600">Categoría<select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18865b]"><option value="">Sin categoría</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><div className="sm:col-span-2"><label className="text-xs font-semibold text-slate-600">Foto del producto</label><div className="mt-1 grid gap-3 sm:grid-cols-[112px_1fr]"><div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2">{form.imagen_url ? <img src={form.imagen_url} alt="Vista previa del producto" className="h-full w-full object-contain" /> : <Package className="text-slate-300" size={30} />}</div><div className="space-y-2"><input type="file" accept="image/*" onChange={handleImageFile} className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:font-semibold file:text-[#18865b]" /><input type="url" value={(form.imagen_url || "").startsWith("data:") ? "" : (form.imagen_url || "")} onChange={(e) => { setForm({ ...form, imagen_url: e.target.value }); setImageError(""); }} placeholder="O pega una URL de imagen" className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm outline-none focus:border-[#18865b]" /><p className="text-xs text-slate-400">Puedes elegir una foto o pegar un enlace.</p>{imageError && <p className="text-xs text-red-600">{imageError}</p>}</div></div></div></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#18865b] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear producto"}</button></div></form></div>}
        {confirmProduct && <ConfirmModal title="Desactivar producto" message={`El producto "${confirmProduct.nombre}" dejará de estar disponible en las operaciones.`} confirmLabel="Desactivar producto" onCancel={() => setConfirmProduct(null)} onConfirm={deactivateProduct} />}
    </Resource>;
}

function Categories() {
    const { user } = useAuth();
    const canManage = user?.rol === "ADMIN";
    const emptyForm = { nombre: "", descripcion: "" };
    const [items, setItems] = useState([]);
    const [products, setProducts] = useState([]);
    const [query, setQuery] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [confirmCategory, setConfirmCategory] = useState(null);

    const load = () => Promise.all([api.get("/categorias"), api.get("/productos")])
        .then(([categoriesResponse, productsResponse]) => {
            setItems(categoriesResponse.data);
            setProducts(productsResponse.data);
        })
        .catch((e) => setError(e.response?.data?.mensaje || "No se pudieron cargar las categorías"));

    useEffect(() => { load(); }, []);

    const resetForm = () => { setEditing(null); setForm(emptyForm); };
    const editCategory = (category) => { setEditing(category); setForm({ nombre: category.nombre, descripcion: category.descripcion || "" }); setError(""); setMessage(""); };
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");
        try {
            if (editing) await api.put(`/categorias/${editing.id}`, form);
            else await api.post("/categorias", form);
            resetForm();
            setMessage(editing ? "Categoría actualizada correctamente" : "Categoría creada correctamente");
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo guardar la categoría");
        } finally {
            setSaving(false);
        }
    };
    const deactivate = async () => {
        if (!confirmCategory) return;
        try {
            await api.delete(`/categorias/${confirmCategory.id}`);
            setConfirmCategory(null);
            setMessage("Categoría desactivada correctamente");
            if (editing?.id === confirmCategory.id) resetForm();
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo desactivar la categoría");
        }
    };
    const productCount = (categoryId) => products.filter((product) => Number(product.categoria_id) === Number(categoryId)).length;
    const filtered = items.filter((category) => `${category.nombre} ${category.descripcion || ""}`.toLowerCase().includes(query.toLowerCase()));
    const activeCount = items.filter((category) => category.estado).length;
    const withoutProducts = items.filter((category) => productCount(category.id) === 0).length;
    const iconFor = (name) => {
        const value = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const Icon = value.includes("bebida") ? CupSoda
            : value.includes("abarrote") ? ShoppingBasket
                : value.includes("lacteo") ? Milk
                    : value.includes("limpieza") ? SprayCan
                        : value.includes("higiene") ? HeartPulse
                            : value.includes("snack") || value.includes("golos") ? Cookie
                                : value.includes("conserva") ? Archive
                                    : value.includes("panader") ? Wheat
                                        : Package;
        return <Icon size={19} strokeWidth={2} />;
    };

    return <Resource title="Categorías de Productos" subtitle="Organiza y clasifica tu catálogo." error={error}>
        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-[#126b47]">{message}</div>}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar categoría..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#18865b]" /></div>
            {canManage && <button onClick={resetForm} className="flex items-center justify-center gap-2 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#126b47]"><Plus size={17} /> Nueva categoría</button>}
        </div>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[["Total categorías", items.length, "text-[#14243a]", "bg-white"], ["Categorías activas", activeCount, "text-emerald-700", "bg-emerald-50"], ["Sin productos", withoutProducts, "text-amber-700", "bg-amber-50"]].map(([label, value, color, background]) => <div key={label} className={`flex items-center justify-between rounded-2xl border border-slate-200 p-5 shadow-sm ${background}`}><div><p className="text-sm text-slate-500">{label}</p><p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p></div><span className={`rounded-lg bg-white/70 px-3 py-2 text-sm font-bold ${color}`}>{value}</span></div>)}
        </div>
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            {canManage && <form onSubmit={submit} className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold text-[#14243a]">{editing ? "Editar categoría" : "Añadir categoría"}</h3><p className="mt-1 text-xs text-slate-500">Completa los datos de la categoría.</p></div>{editing && <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-400 hover:text-[#18865b]">Cancelar</button>}</div><label className="mb-4 block text-xs font-semibold text-slate-600">Nombre de la categoría *<input required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Ej. Bebidas, Lácteos..." className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18865b]" /></label><label className="mb-5 block text-xs font-semibold text-slate-600">Descripción (opcional)<textarea value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} placeholder="Describe esta categoría..." rows="4" className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18865b]" /></label><button disabled={saving} className="w-full rounded-xl bg-[#18865b] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Guardar categoría"}</button></form>}
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-4 text-lg font-bold text-[#14243a]">Listado de categorías</h3><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-slate-100 bg-[#f8fafc] text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Identificación", "Nombre", "Productos", "Estado", "Acciones"].map((header) => <th key={header} className="px-3 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.length ? filtered.map((category) => { const count = productCount(category.id); return <tr key={category.id} className="transition hover:bg-emerald-50/30"><td className="px-3 py-4 text-slate-500">{category.id}</td><td className="px-3 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-[#18865b]">{iconFor(category.nombre)}</span><div><p className="font-semibold text-[#14243a]">{category.nombre}</p>{category.descripcion && <p className="max-w-[220px] truncate text-xs text-slate-400">{category.descripcion}</p>}</div></div></td><td className="px-3 py-4 text-slate-600">{count} {count === 1 ? "producto" : "productos"}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category.estado ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{category.estado ? "Activa" : "Inactiva"}</span></td><td className="px-3 py-4"><div className="flex gap-1">{canManage && <><button onClick={() => editCategory(category)} title="Editar categoría" className="rounded-lg p-2 text-slate-600 hover:bg-emerald-50 hover:text-[#18865b]"><Pencil size={16} /></button>{category.estado &&             <button onClick={() => setConfirmCategory(category)} title="Desactivar categoría" className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"><X size={16} /></button>}</>}</div></td></tr>; }) : <tr><td colSpan="5" className="px-3 py-12 text-center text-slate-400">No hay categorías para mostrar</td></tr>}</tbody></table></div></div>
        </div>
        {confirmCategory && <ConfirmModal title="Desactivar categoría" message={`La categoría "${confirmCategory.nombre}" dejará de aparecer como opción activa.`} confirmLabel="Desactivar categoría" onCancel={() => setConfirmCategory(null)} onConfirm={deactivate} />}
    </Resource>;
}

function Purchases() {
    const [today] = useState(() => new Date());
    const todayValue = today.toISOString().slice(0, 10);
    const emptyForm = { proveedor_id: "", numero_documento: "", fecha: todayValue, observaciones: "" };
    const [items, setItems] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [line, setLine] = useState({ producto_id: "", cantidad: 1, costo_unitario: 0 });
    const [lines, setLines] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const load = () => Promise.all([api.get("/compras"), api.get("/productos"), api.get("/proveedores")]).then(([purchases, productResponse, supplierResponse]) => { setItems(purchases.data); setProducts(productResponse.data.filter((product) => product.estado)); setSuppliers(supplierResponse.data); }).catch((e) => setError(e.response?.data?.mensaje || "No se pudieron cargar las compras"));
    useEffect(() => { load(); }, []);
    const openModal = () => { setForm({ ...emptyForm, fecha: todayValue }); setLine({ producto_id: "", cantidad: 1, costo_unitario: 0 }); setLines([]); setError(""); setModalOpen(true); };
    const addLine = (event) => {
        event.preventDefault();
        const product = products.find((item) => String(item.id) === String(line.producto_id));
        if (!product || Number(line.cantidad) <= 0 || Number(line.costo_unitario) < 0) return setError("Selecciona un producto y completa una cantidad y costo válidos");
        setLines((current) => [...current, { ...line, producto_id: product.id, producto: product.nombre, cantidad: Number(line.cantidad), costo_unitario: Number(line.costo_unitario) }]);
        setLine({ producto_id: "", cantidad: 1, costo_unitario: 0 });
        setError("");
    };
    const createPurchase = async (event) => {
        event.preventDefault();
        if (!lines.length) return setError("Agrega al menos un producto a la compra");
        setSaving(true);
        setError("");
        try {
            const response = await api.post("/compras", { ...form, proveedor_id: form.proveedor_id || null });
            const purchaseId = response.data.compra.id;
            for (const item of lines) await api.post(`/compras/${purchaseId}/detalles`, { producto_id: item.producto_id, cantidad: item.cantidad, costo_unitario: item.costo_unitario });
            await api.post(`/compras/${purchaseId}/confirmar`);
            setModalOpen(false);
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo registrar la compra");
        } finally {
            setSaving(false);
        }
    };
    const filtered = items.filter((purchase) => `${purchase.numero_documento || ""} ${purchase.proveedor || ""} ${purchase.estado}`.toLowerCase().includes(query.toLowerCase()) && (!status || purchase.estado === status));
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthItems = items.filter((purchase) => {
        const purchaseDate = new Date(purchase.fecha);
        return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
    });
    const totalMonth = monthItems.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
    const pending = items.filter((purchase) => purchase.estado === "BORRADOR").length;
    const money = (value) => `S/ ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return <Resource title="Compras" subtitle="Registra adquisiciones y controla el ingreso de mercadería." error={error}>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar documento o proveedor..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#18865b]" /></div><button onClick={openModal} className="flex items-center justify-center gap-2 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#126b47]"><Plus size={17} /> Registrar compra</button></div>
        <div className="mb-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Compras del mes</p><p className="mt-1 text-3xl font-bold text-[#14243a]">{monthItems.length}</p><p className="mt-1 text-xs text-slate-400">Documentos registrados</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm"><p className="text-sm text-emerald-700">Gasto del mes</p><p className="mt-1 text-3xl font-bold text-emerald-800">{money(totalMonth)}</p><p className="mt-1 text-xs text-emerald-700">Total confirmado y registrado</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm"><p className="text-sm text-amber-700">Pendientes</p><p className="mt-1 text-3xl font-bold text-amber-800">{pending}</p><p className="mt-1 text-xs text-amber-700">Compras en borrador</p></div></div>
        <div className="mb-4 flex justify-end"><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Todos los estados</option><option value="CONFIRMADA">Confirmadas</option><option value="BORRADOR">Borradores</option><option value="ANULADA">Anuladas</option></select></div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-slate-100 bg-[#f8fafc] text-[11px] uppercase tracking-wider text-slate-500"><tr>{["ID", "Documento", "Proveedor", "Fecha", "Total", "Estado"].map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.length ? filtered.map((purchase) => <tr key={purchase.id} className="transition hover:bg-emerald-50/30"><td className="px-4 py-4 text-slate-500">{purchase.id}</td><td className="px-4 py-4 font-semibold text-[#14243a]">{purchase.numero_documento || "Sin documento"}</td><td className="px-4 py-4 text-slate-600">{purchase.proveedor || "Proveedor general"}</td><td className="px-4 py-4 text-slate-600">{formatDate(purchase.fecha)}</td><td className="px-4 py-4 font-bold text-[#14243a]">{money(purchase.total)}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${purchase.estado === "CONFIRMADA" ? "bg-emerald-100 text-emerald-800" : purchase.estado === "BORRADOR" ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-700"}`}>{purchase.estado === "CONFIRMADA" ? <CheckCircle2 size={13} /> : purchase.estado === "BORRADOR" ? <Clock3 size={13} /> : <FileText size={13} />}{purchase.estado}</span></td></tr>) : <tr><td colSpan="6" className="px-5 py-14 text-center text-slate-400">No hay compras para mostrar</td></tr>}</tbody></table></div>
        {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><form onSubmit={createPurchase} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-[#14243a]">Registrar compra</h3><p className="text-sm text-slate-500">La confirmación actualizará el inventario.</p></div><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><div className="grid gap-4 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-600">Proveedor<select value={form.proveedor_id} onChange={(event) => setForm({ ...form, proveedor_id: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal"><option value="">Proveedor general</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.nombre}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Documento<input value={form.numero_documento} onChange={(event) => setForm({ ...form, numero_documento: event.target.value })} placeholder="FAC-0001" className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">Fecha<input required type="date" value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal" /></label></div><div className="mt-5 rounded-xl border border-slate-200 bg-[#f8fafc] p-4"><p className="mb-3 text-sm font-bold text-[#14243a]">Productos recibidos</p><div className="grid gap-3 sm:grid-cols-[1fr_110px_130px_auto]"><select value={line.producto_id} onChange={(event) => { const product = products.find((item) => String(item.id) === event.target.value); setLine({ ...line, producto_id: event.target.value, costo_unitario: product?.precio_compra || 0 }); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Selecciona un producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}</select><input min="0.001" step="0.001" type="number" value={line.cantidad} onChange={(event) => setLine({ ...line, cantidad: event.target.value })} placeholder="Cantidad" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><input min="0" step="0.01" type="number" value={line.costo_unitario} onChange={(event) => setLine({ ...line, costo_unitario: event.target.value })} placeholder="Costo unitario" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><button type="button" onClick={addLine} className="rounded-xl bg-[#14243a] px-3 py-2 text-sm font-semibold text-white">Agregar</button></div>{lines.length > 0 && <div className="mt-4 divide-y divide-slate-200 rounded-xl bg-white">{lines.map((item, index) => <div key={`${item.producto_id}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span>{item.producto} × {item.cantidad}</span><span className="font-semibold">{money(item.cantidad * item.costo_unitario)}</span></div>)}</div>}</div><div className="mt-5 flex items-center justify-between"><span className="text-sm text-slate-500">Total estimado</span><strong className="text-2xl text-[#14243a]">{money(lines.reduce((sum, item) => sum + item.cantidad * item.costo_unitario, 0))}</strong></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#18865b] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Registrando..." : "Confirmar compra"}</button></div></form></div>}
    </Resource>;
}

function Clients() {
    const emptyForm = { nombre: "", documento: "", telefono: "", correo: "", direccion: "" };
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [confirmClient, setConfirmClient] = useState(null);
    const load = () => api.get("/clientes").then((response) => setItems(response.data)).catch((e) => setError(e.response?.data?.mensaje || "No se pudieron cargar los clientes"));
    useEffect(() => { load(); }, []);
    const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setError(""); setModalOpen(true); };
    const openEdit = (client) => { setEditing(client); setForm({ nombre: client.nombre || "", documento: client.documento || "", telefono: client.telefono || "", correo: client.correo || "", direccion: client.direccion || "" }); setError(""); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditing(null); };
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");
        try {
            if (editing) await api.put(`/clientes/${editing.id}`, form);
            else await api.post("/clientes", form);
            closeModal();
            setMessage(editing ? "Cliente actualizado correctamente" : "Cliente registrado correctamente");
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo guardar el cliente");
        } finally {
            setSaving(false);
        }
    };
    const deactivate = async () => {
        if (!confirmClient) return;
        try {
            await api.delete(`/clientes/${confirmClient.id}`);
            setConfirmClient(null);
            setMessage("Cliente desactivado correctamente");
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo desactivar el cliente");
        }
    };
    const filtered = items.filter((client) => `${client.nombre} ${client.documento || ""} ${client.telefono || ""}`.toLowerCase().includes(query.toLowerCase()));
    return <Resource title="Clientes" subtitle="Administra compradores frecuentes y sus datos de contacto." error={error}>
        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-[#126b47]">{message}</div>}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, documento o teléfono..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#18865b]" /></div><button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#126b47]"><Plus size={17} /> Nuevo cliente</button></div>
        <div className="mb-6 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Clientes registrados</p><p className="mt-1 text-3xl font-bold text-[#14243a]">{items.length}</p><p className="mt-1 text-xs text-slate-400">Compradores disponibles en el POS</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm"><p className="text-sm text-emerald-700">Clientes activos</p><p className="mt-1 text-3xl font-bold text-emerald-800">{items.filter((client) => client.estado !== false).length}</p><p className="mt-1 text-xs text-emerald-700">Registros habilitados</p></div></div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-100 bg-[#f8fafc] text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Identificación", "Cliente", "Documento", "Teléfono", "Correo", "Dirección", "Acciones"].map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.length ? filtered.map((client) => <tr key={client.id} className="transition hover:bg-emerald-50/30"><td className="px-4 py-4 text-slate-500">{client.id}</td><td className="px-4 py-4 font-semibold text-[#14243a]">{client.nombre}</td><td className="px-4 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{client.documento || "Sin documento"}</span></td><td className="px-4 py-4 text-slate-600">{client.telefono || "-"}</td><td className="px-4 py-4 text-slate-600">{client.correo || "-"}</td><td className="max-w-[180px] truncate px-4 py-4 text-slate-600">{client.direccion || "-"}</td><td className="px-4 py-4"><div className="flex gap-1"><button onClick={() => openEdit(client)} title="Editar cliente" className="rounded-lg p-2 text-slate-600 hover:bg-emerald-50 hover:text-[#18865b]"><Pencil size={16} /></button>        <button onClick={() => setConfirmClient(client)} title="Desactivar cliente" className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"><X size={16} /></button></div></td></tr>) : <tr><td colSpan="7" className="px-5 py-14 text-center text-slate-400">No hay clientes para mostrar</td></tr>}</tbody></table></div>
        {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-[#14243a]">{editing ? "Editar cliente" : "Nuevo cliente"}</h3><p className="text-sm text-slate-500">Registra la información de contacto.</p></div><button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><div className="grid gap-4 sm:grid-cols-2">{[["nombre", "Nombre completo", true], ["documento", "DNI / RUC", false], ["telefono", "Teléfono", false], ["correo", "Correo electrónico", false], ["direccion", "Dirección", false]].map(([key, label, required]) => <label key={key} className={`text-xs font-semibold text-slate-600 ${key === "direccion" ? "sm:col-span-2" : ""}`}>{label}{required && " *"}<input required={required} type={key === "correo" ? "email" : "text"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18865b]" /></label>)}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#18865b] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Registrar cliente"}</button></div></form></div>}
        {confirmClient && <ConfirmModal title="Desactivar cliente" message={`El cliente "${confirmClient.nombre}" dejará de estar disponible para nuevas ventas.`} confirmLabel="Desactivar cliente" onCancel={() => setConfirmClient(null)} onConfirm={deactivate} />}
    </Resource>;
}

function Suppliers() {
    const emptyForm = { nombre: "", documento: "", telefono: "", correo: "", direccion: "" };
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [confirmSupplier, setConfirmSupplier] = useState(null);
    const load = () => api.get("/proveedores").then((response) => setItems(response.data)).catch((e) => setError(e.response?.data?.mensaje || "No se pudieron cargar los proveedores"));
    useEffect(() => { load(); }, []);
    const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setError(""); setModalOpen(true); };
    const openEdit = (supplier) => { setEditing(supplier); setForm({ nombre: supplier.nombre || "", documento: supplier.documento || "", telefono: supplier.telefono || "", correo: supplier.correo || "", direccion: supplier.direccion || "" }); setError(""); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditing(null); };
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");
        try {
            if (editing) await api.put(`/proveedores/${editing.id}`, form);
            else await api.post("/proveedores", form);
            closeModal();
            setMessage(editing ? "Proveedor actualizado correctamente" : "Proveedor registrado correctamente");
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo guardar el proveedor");
        } finally {
            setSaving(false);
        }
    };
    const deactivate = async () => {
        if (!confirmSupplier) return;
        try {
            await api.delete(`/proveedores/${confirmSupplier.id}`);
            setConfirmSupplier(null);
            setMessage("Proveedor desactivado correctamente");
            await load();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo desactivar el proveedor");
        }
    };
    const filtered = items.filter((supplier) => `${supplier.nombre} ${supplier.documento || ""} ${supplier.telefono || ""}`.toLowerCase().includes(query.toLowerCase()));
    return <Resource title="Proveedores" subtitle="Administra tus proveedores y contactos comerciales." error={error}>
        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-[#126b47]">{message}</div>}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, RUC o teléfono..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#18865b]" /></div><button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#126b47]"><Plus size={17} /> Nuevo proveedor</button></div>
        <div className="mb-6 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Proveedores registrados</p><p className="mt-1 text-3xl font-bold text-[#14243a]">{items.length}</p><p className="mt-1 text-xs text-slate-400">Contactos comerciales disponibles</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm"><p className="text-sm text-blue-700">Proveedores activos</p><p className="mt-1 text-3xl font-bold text-blue-800">{items.filter((supplier) => supplier.estado !== false).length}</p><p className="mt-1 text-xs text-blue-700">Habilitados para compras</p></div></div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-100 bg-[#f8fafc] text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Identificación", "Proveedor", "RUC / Documento", "Teléfono", "Correo", "Dirección", "Acciones"].map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.length ? filtered.map((supplier) => <tr key={supplier.id} className="transition hover:bg-emerald-50/30"><td className="px-4 py-4 text-slate-500">{supplier.id}</td><td className="px-4 py-4 font-semibold text-[#14243a]">{supplier.nombre}</td><td className="px-4 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{supplier.documento || "Sin documento"}</span></td><td className="px-4 py-4 text-slate-600">{supplier.telefono || "-"}</td><td className="px-4 py-4 text-slate-600">{supplier.correo || "-"}</td><td className="max-w-[180px] truncate px-4 py-4 text-slate-600">{supplier.direccion || "-"}</td><td className="px-4 py-4"><div className="flex gap-1"><button onClick={() => openEdit(supplier)} title="Editar proveedor" className="rounded-lg p-2 text-slate-600 hover:bg-emerald-50 hover:text-[#18865b]"><Pencil size={16} /></button>        <button onClick={() => setConfirmSupplier(supplier)} title="Desactivar proveedor" className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"><X size={16} /></button></div></td></tr>) : <tr><td colSpan="7" className="px-5 py-14 text-center text-slate-400">No hay proveedores para mostrar</td></tr>}</tbody></table></div>
        {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-[#14243a]">{editing ? "Editar proveedor" : "Nuevo proveedor"}</h3><p className="text-sm text-slate-500">Registra la información comercial.</p></div><button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><div className="grid gap-4 sm:grid-cols-2">{[["nombre", "Razón social / Nombre", true], ["documento", "RUC / Documento", false], ["telefono", "Teléfono", false], ["correo", "Correo electrónico", false], ["direccion", "Dirección", false]].map(([key, label, required]) => <label key={key} className={`text-xs font-semibold text-slate-600 ${key === "direccion" ? "sm:col-span-2" : ""}`}>{label}{required && " *"}<input required={required} type={key === "correo" ? "email" : "text"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18865b]" /></label>)}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#18865b] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Registrar proveedor"}</button></div></form></div>}
        {confirmSupplier && <ConfirmModal title="Desactivar proveedor" message={`El proveedor "${confirmSupplier.nombre}" dejará de aparecer como contacto activo para nuevas compras.`} confirmLabel="Desactivar proveedor" onCancel={() => setConfirmSupplier(null)} onConfirm={deactivate} />}
    </Resource>;
}

function Inventory() {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [error, setError] = useState("");
    const [adjustment, setAdjustment] = useState(null);
    const [newStock, setNewStock] = useState("");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => { api.get("/productos").then((response) => setItems(response.data)).catch((e) => setError(e.response?.data?.mensaje || "No se pudo cargar el inventario")); }, []);
    const integer = (value) => Math.round(Number(value) || 0).toLocaleString("es-PE");
    const filtered = items.filter((product) => `${product.nombre} ${product.codigo}`.toLowerCase().includes(query.toLowerCase()));
    const totalStock = items.reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
    const outOfStock = items.filter((product) => Number(product.stock) <= 0).length;
    const lowStock = items.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= Number(product.stock_minimo)).length;
    const inventoryValue = items.reduce((sum, product) => sum + ((Number(product.stock) || 0) * (Number(product.precio_compra) || 0)), 0);
    const money = (value) => `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const reload = () => api.get("/productos").then((response) => setItems(response.data));
    const saveAdjustment = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            await api.post("/inventario/movimientos", { producto_id: adjustment.id, tipo: "AJUSTE", cantidad: Number(newStock), motivo: reason.trim() || "Ajuste desde inventario" });
            setAdjustment(null);
            setNewStock("");
            setReason("");
            await reload();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo ajustar el stock");
        } finally {
            setSaving(false);
        }
    };
    return <Resource title="Inventario" subtitle="Controla existencias y alertas de reposición." error={error}>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o código..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#18865b]" /></div><button onClick={() => { setAdjustment(items[0] || null); setNewStock(String(Math.round(Number(items[0]?.stock) || 0))); }} disabled={!items.length} className="flex items-center justify-center gap-2 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#126b47] disabled:opacity-50"><Plus size={17} /> Ajustar stock</button></div>
        <div className="mb-6 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total de stock</p><p className="mt-1 text-3xl font-bold text-[#14243a]">{integer(totalStock)}</p><p className="mt-1 text-xs text-slate-400">{items.length} productos registrados</p></div><div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm"><p className="text-sm text-red-700">Productos agotados</p><p className="mt-1 text-3xl font-bold text-red-700">{outOfStock}</p><p className="mt-1 text-xs text-red-600">{lowStock} requieren reposición</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm"><p className="text-sm text-emerald-700">Valorización del inventario</p><p className="mt-1 text-3xl font-bold text-emerald-800">{money(inventoryValue)}</p><p className="mt-1 text-xs text-emerald-700">Calculado al precio de costo</p></div></div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-slate-100 bg-[#f8fafc] text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Foto", "Código", "Producto", "Stock real", "Stock mínimo", "Estado", "Valor costo", "Acción"].map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.length ? filtered.map((product) => { const stock = Number(product.stock) || 0; const minimum = Number(product.stock_minimo) || 0; const exhausted = stock <= 0; const low = !exhausted && stock <= minimum; return <tr key={product.id} className="transition hover:bg-emerald-50/30"><td className="px-4 py-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50"><ProductImage product={product} className="h-10 w-10" /></div></td><td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{product.codigo}</span></td><td className="px-4 py-3 font-semibold text-[#14243a]">{product.nombre}</td><td className={`px-4 py-3 text-base font-bold ${exhausted ? "text-red-600" : low ? "text-amber-700" : "text-[#14243a]"}`}>{integer(stock)}</td><td className="px-4 py-3 text-slate-600">{integer(minimum)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${exhausted ? "bg-red-100 text-red-700" : low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{exhausted ? "Agotado" : low ? "Reponer stock" : "Normal"}</span></td><td className="px-4 py-3 font-semibold text-slate-600">{money(stock * (Number(product.precio_compra) || 0))}</td><td className="px-4 py-3"><button onClick={() => { setAdjustment(product); setNewStock(String(Math.round(stock))); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#18865b] hover:bg-emerald-50">Ajustar</button></td></tr>; }) : <tr><td colSpan="8" className="px-5 py-14 text-center text-slate-400">No hay productos para mostrar</td></tr>}</tbody></table></div>
        <div className="space-y-3 md:hidden">{filtered.length ? filtered.map((product) => { const stock = Number(product.stock) || 0; const minimum = Number(product.stock_minimo) || 0; const exhausted = stock <= 0; const low = !exhausted && stock <= minimum; return <article key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50"><ProductImage product={product} className="h-11 w-11" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate font-bold text-[#14243a]">{product.nombre}</p><p className="mt-1 text-xs text-slate-500">{product.codigo}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${exhausted ? "bg-red-100 text-red-700" : low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{exhausted ? "Agotado" : low ? "Reponer" : "Normal"}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Stock</p><p className={`font-bold ${exhausted ? "text-red-600" : low ? "text-amber-700" : "text-[#14243a]"}`}>{integer(stock)}</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Mínimo</p><p className="font-bold text-[#14243a]">{integer(minimum)}</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Valor</p><p className="truncate font-bold text-[#14243a]">{money(stock * (Number(product.precio_compra) || 0))}</p></div></div><button onClick={() => { setAdjustment(product); setNewStock(String(Math.round(stock))); }} className="mt-3 w-full rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-[#18865b]">Ajustar stock</button></div></div></article>; }) : <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center text-slate-400">No hay productos para mostrar</div>}</div>
        {adjustment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setAdjustment(null); }}><form onSubmit={saveAdjustment} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-[#14243a]">Ajustar stock</h3><p className="text-sm text-slate-500">{adjustment.nombre}</p></div><button type="button" onClick={() => setAdjustment(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><label className="block text-xs font-semibold text-slate-600">Nuevo stock<input required min="0" type="number" step="1" value={newStock} onChange={(event) => setNewStock(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18865b]" /></label><label className="mt-4 block text-xs font-semibold text-slate-600">Motivo (opcional)<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Conteo físico, recepción..." className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18865b]" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setAdjustment(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#18865b] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar ajuste"}</button></div></form></div>}
    </Resource>;
}

function PointOfSale() {
    const [products, setProducts] = useState([]);
    const [clients, setClients] = useState([]);
    const [categories, setCategories] = useState([]);
    const [category, setCategory] = useState("");
    const [cart, setCart] = useState([]);
    const [query, setQuery] = useState("");
    const [clientId, setClientId] = useState("");
    const [payment, setPayment] = useState("EFECTIVO");
    const [received, setReceived] = useState("");
    const [paymentReference, setPaymentReference] = useState("");
    const [showQr, setShowQr] = useState(false);
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([api.get("/productos"), api.get("/clientes"), api.get("/categorias")])
            .then(([productResponse, clientResponse, categoryResponse]) => {
                setProducts(productResponse.data.filter((product) => product.estado));
                setClients(clientResponse.data);
                setCategories(categoryResponse.data.filter((item) => item.estado));
            })
            .catch((e) => setError(e.response?.data?.mensaje || "No se pudo cargar el punto de venta"));
    }, []);

    const filteredProducts = products.filter((product) => (!category || String(product.categoria_id) === category) &&
        `${product.nombre} ${product.codigo} ${product.codigo_barras || ""}`.toLowerCase().includes(query.toLowerCase())
    );
    const total = cart.reduce((sum, item) => sum + Number(item.precio_venta) * item.cantidad, 0);
    const maxStock = (product) => Number(product.stock) || 0;
    const focusSearch = () => document.getElementById("pos-search")?.focus();

    const addToCart = (product) => {
        setMessage("");
        setCart((current) => {
            const existing = current.find((item) => item.id === product.id);
            if (existing) {
                if (existing.cantidad >= maxStock(product)) {
                    setError(`Stock máximo disponible: ${maxStock(product)} unidades`);
                    return current;
                }
                return current.map((item) => item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item);
            }
            if (maxStock(product) < 1) {
                setError("Este producto no tiene stock disponible");
                return current;
            }
            return [...current, { ...product, cantidad: 1 }];
        });
    };
    const changeQuantity = (id, value) => {
        const product = products.find((item) => item.id === id);
        const quantity = Math.max(0, Number(value));
        if (product && quantity > maxStock(product)) {
            setError(`Stock máximo disponible: ${maxStock(product)} unidades`);
            return;
        }
        setCart((current) => quantity === 0 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, cantidad: quantity } : item));
    };
    const handleScannerKeyDown = (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const scanned = query.trim().toLowerCase();
        const product = products.find((item) => [item.codigo, item.codigo_barras].filter(Boolean).some((code) => String(code).toLowerCase() === scanned));
        if (product) {
            addToCart(product);
            setQuery("");
        } else {
            setError("No se encontró un producto con ese código");
        }
        focusSearch();
    };
    const confirmSale = async () => {
        if (!cart.length) return setError("Agrega al menos un producto al carrito");
        setSaving(true); setError(""); setMessage("");
        try {
            if (payment !== "EFECTIVO" && !paymentReference.trim()) return setError("Registra el código o número de operación del pago digital");
            const saleResponse = await api.post("/ventas", {
                cliente_id: clientId || null,
                metodo_pago: payment,
                observaciones: payment !== "EFECTIVO" ? `Operación ${payment}: ${paymentReference.trim()}` : null
            });
            const saleId = saleResponse.data.venta.id;
            for (const item of cart) await api.post(`/ventas/${saleId}/detalles`, { producto_id: item.id, cantidad: item.cantidad });
            await api.post(`/ventas/${saleId}/confirmar`);
            setTicket({ id: saleId, items: cart, total, payment, received: payment === "EFECTIVO" ? Number(received) : total, change: payment === "EFECTIVO" ? Math.max(0, Number(received) - total) : 0, date: new Date() });
            setCart([]); setClientId(""); setMessage(`Venta #${saleId} confirmada correctamente`);
            setReceived(""); setPaymentReference(""); setShowQr(false);
            const refreshed = await api.get("/productos");
            setProducts(refreshed.data.filter((product) => product.estado));
            focusSearch();
        } catch (e) {
            setError(e.response?.data?.mensaje || "No se pudo confirmar la venta");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "F2") { event.preventDefault(); document.getElementById("pos-search")?.focus(); }
            if (event.key === "F12" && cart.length) { event.preventDefault(); document.getElementById("pos-confirm")?.click(); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cart.length]);

    return <Resource title="Punto de venta" subtitle="Busca productos, arma el carrito y confirma el cobro." error={error}>
        {message && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-[#126b47]">{message}</div>}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1.35fr)_380px]">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="relative mb-3"><Search className="absolute left-4 top-4 text-slate-400" size={20} /><input id="pos-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleScannerKeyDown} placeholder="Buscar por nombre, código o código de barras..." className="h-14 w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-3 pl-12 pr-16 text-sm outline-none focus:border-[#18865b] focus:ring-2 focus:ring-[#18865b]/10" /><kbd className="absolute right-3 top-3 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-400">F2 / Enter</kbd></div>
                <div className="sidebar-scroll mb-5 flex gap-2 overflow-x-auto pb-1"><button onClick={() => setCategory("")} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${!category ? "bg-[#18865b] text-white" : "bg-slate-100 text-slate-500"}`}>Todos</button>{categories.map((item) => <button key={item.id} onClick={() => setCategory(String(item.id))} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${category === String(item.id) ? "bg-[#18865b] text-white" : "bg-slate-100 text-slate-500"}`}>{item.nombre}</button>)}</div>
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{filteredProducts.map((product) => <button key={product.id} onClick={() => addToCart(product)} className="rounded-xl border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#18865b] hover:shadow-md"><div className="mb-2 flex h-28 items-center justify-between rounded-lg bg-slate-50 px-3"><ProductImage product={product} className="h-24 w-full" /><span className={`self-start pt-2 text-[10px] font-semibold ${Number(product.stock) > 0 ? "text-[#18865b]" : "text-red-500"}`}>{product.stock} disp.</span></div><p className="truncate text-sm font-semibold text-[#14243a]">{product.nombre}</p><p className="mt-1 text-xs text-slate-500">{product.codigo}</p><p className="mt-2 text-lg font-bold text-[#18865b]">S/ {product.precio_venta}</p></button>)}</div>
                {!filteredProducts.length && <p className="py-12 text-center text-sm text-slate-400">No se encontraron productos.</p>}
            </div>
            <div className="h-fit min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><h3 className="font-bold">Carrito</h3><p className="text-xs text-slate-500">{cart.length} productos</p></div><ShoppingCart className="text-[#18865b]" size={21} /></div>
                <div className="my-4 max-h-72 space-y-3 overflow-y-auto">{cart.length ? cart.map((item) => <div key={item.id} className="rounded-xl bg-[#f8fafc] p-3"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white"><ProductImage product={item} className="h-9 w-9" /></div><p className="truncate text-sm font-semibold">{item.nombre}</p></div><button onClick={() => changeQuantity(item.id, 0)} className="text-xs text-red-500">Quitar</button></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => changeQuantity(item.id, item.cantidad - 1)} className="h-7 w-7 rounded-lg border border-slate-200 bg-white">−</button><input type="number" min="1" max={maxStock(item)} value={item.cantidad} onChange={(e) => changeQuantity(item.id, e.target.value)} className="w-12 rounded-lg border border-slate-200 bg-white py-1 text-center text-sm" /><button disabled={item.cantidad >= maxStock(item)} onClick={() => changeQuantity(item.id, item.cantidad + 1)} className="h-7 w-7 rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-40">+</button></div><span className="text-sm font-bold">S/ {(Number(item.precio_venta) * item.cantidad).toFixed(2)}</span></div></div>) : <div className="py-10 text-center text-slate-400"><ShoppingCart className="mx-auto mb-2 opacity-30" size={34} /><p className="text-sm">Escanea o selecciona un producto para comenzar</p></div>}</div>
                <div className="space-y-3 border-t border-slate-100 pt-4"><label className="block text-xs font-semibold uppercase text-slate-500">Cliente (opcional)<select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal"><option value="">Cliente general</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}</select></label><div><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Método de pago</p><div className="grid grid-cols-3 gap-2">{[["EFECTIVO", Banknote, "bg-emerald-50 text-[#18865b]"], ["YAPE", Smartphone, "bg-purple-50 text-purple-600"], ["PLIN", Smartphone, "bg-sky-50 text-sky-600"]].map(([value, Icon, style]) => <button type="button" key={value} onClick={() => { setPayment(value); setPaymentReference(""); setShowQr(false); }} className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-bold ${payment === value ? "border-[#18865b] ring-1 ring-[#18865b]" : "border-slate-200"} ${style}`}><Icon size={17} />{value}</button>)}</div></div>{payment === "EFECTIVO" ? <div><label className="block text-xs font-semibold uppercase text-slate-500">Importe recibido<input type="number" min={total} step="0.01" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={`Mínimo S/ ${total.toFixed(2)}`} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal" /></label><div className="mt-2 grid grid-cols-5 gap-1.5">{["Exacto", 10, 20, 50, 100].map((amount) => <button type="button" key={amount} onClick={() => setReceived(String(amount === "Exacto" ? total : amount))} className="rounded-lg bg-slate-100 px-1 py-1.5 text-[11px] font-semibold text-slate-600">{amount === "Exacto" ? amount : `S/ ${amount}`}</button>)}</div><p className={`mt-2 text-right text-sm font-bold ${Number(received) >= total ? "text-[#18865b]" : "text-red-500"}`}>Vuelto: S/ {Math.max(0, Number(received || 0) - total).toFixed(2)}</p></div> : <div className="rounded-xl border border-purple-100 bg-purple-50 p-3"><label className="block text-xs font-semibold uppercase text-purple-700">Código o número de operación<input required value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Ej. 123456" className="mt-1 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-purple-500" /></label><button type="button" onClick={() => setShowQr(!showQr)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-xs font-semibold text-purple-700"><QrCode size={15} /> {showQr ? "Ocultar QR" : "Mostrar QR de pago"}</button>{showQr && <div className="mt-3 flex flex-col items-center rounded-lg border border-dashed border-purple-300 bg-white p-3"><QrCode size={92} className="text-purple-700" /><p className="mt-2 text-center text-[10px] text-purple-700">Muestra este código configurado para tu cuenta y confirma el pago en la aplicación.</p></div>}<p className="mt-2 text-[11px] text-purple-700">Verifica el pago en la aplicación antes de confirmar.</p></div>}<div className="flex items-end justify-between pt-2"><span className="text-sm text-slate-500">Total a cobrar</span><span className="text-2xl font-bold text-[#14243a]">S/ {total.toFixed(2)}</span></div><button id="pos-confirm" disabled={saving || !cart.length || (payment === "EFECTIVO" && Number(received) < total)} onClick={confirmSale} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#18865b] py-3 font-semibold text-white shadow-lg shadow-emerald-800/20 hover:bg-[#126b47] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Procesando..." : "Cobrar venta · F12"}</button></div>
            </div>
        </div>
        {ticket && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setTicket(null); }}><div className="ticket-print w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"><div className="text-center"><Receipt className="mx-auto text-[#18865b]" size={28} /><h3 className="font-bold">Minimarket Express</h3><p className="text-xs text-slate-500">Venta #{ticket.id} · {ticket.date.toLocaleString("es-PE")}</p></div><div className="my-4 space-y-2 border-y border-dashed border-slate-300 py-3 text-sm">{ticket.items.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.cantidad} x {item.nombre}</span><span>S/ {(Number(item.precio_venta) * item.cantidad).toFixed(2)}</span></div>)}</div><div className="space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>S/ {(ticket.total / 1.18).toFixed(2)}</span></div><div className="flex justify-between"><span>IGV (18%)</span><span>S/ {(ticket.total - ticket.total / 1.18).toFixed(2)}</span></div><div className="flex justify-between text-lg font-bold"><span>Total</span><span>S/ {ticket.total.toFixed(2)}</span></div><div className="flex justify-between"><span>Pago</span><span>{ticket.payment}</span></div><div className="flex justify-between"><span>Recibido</span><span>S/ {ticket.received.toFixed(2)}</span></div><div className="flex justify-between"><span>Vuelto</span><span>S/ {ticket.change.toFixed(2)}</span></div></div><div className="mt-5 flex gap-2"><button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#18865b] py-2.5 text-sm font-semibold text-white"><Printer size={16} /> Imprimir</button><button onClick={() => setTicket(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cerrar</button></div></div></div>}
    </Resource>;
}

function UsersModule() {
    const empty = { nombre: "", correo: "", password: "", rol_id: "2", estado: true };
    const [users, setUsers] = useState([]); const [form, setForm] = useState(empty); const [editing, setEditing] = useState(null); const [modalOpen, setModalOpen] = useState(false); const [query, setQuery] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
    const load = () => api.get("/usuarios").then((response) => setUsers(response.data.usuarios || [])).catch((e) => setError(e.response?.data?.mensaje || "No se pudieron cargar los usuarios"));
    useEffect(() => { load(); }, []);
    const openNew = () => { setEditing(null); setForm({ ...empty }); setError(""); setModalOpen(true); };
    const openEdit = (user) => { setEditing(user); setForm({ nombre: user.nombre, correo: user.correo, password: "", rol_id: String(user.rol_id), estado: user.estado }); setError(""); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditing(null); };
    const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); setMessage(""); try { if (editing) { await api.put(`/usuarios/${editing.id}`, { nombre: form.nombre, correo: form.correo, rol_id: form.rol_id, estado: form.estado }); if (form.password) await api.put(`/usuarios/${editing.id}/password`, { password: form.password }); } else await api.post("/usuarios", form); closeModal(); setMessage(editing ? (form.password ? "Usuario y contraseña actualizados correctamente" : "Usuario actualizado correctamente") : "Usuario creado correctamente"); await load(); } catch (e) { setError(e.response?.data?.mensaje || "No se pudo guardar el usuario"); } finally { setSaving(false); } };
    const toggle = async (user) => { try { await api.patch(`/usuarios/${user.id}/estado`, { estado: !user.estado }); setMessage(`Usuario ${user.estado ? "desactivado" : "activado"} correctamente`); await load(); } catch (e) { setError(e.response?.data?.mensaje || "No se pudo cambiar el estado"); } };
    const filtered = users.filter((user) => `${user.nombre} ${user.correo} ${user.rol}`.toLowerCase().includes(query.toLowerCase()));
    const active = users.filter((user) => user.estado).length;
    const admins = users.filter((user) => user.rol === "ADMIN").length;
    return <Resource title="Usuarios y roles" subtitle="Administra accesos, responsabilidades y estados del equipo." error={error}>{message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-[#126b47]">{message}</div>}<div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="relative max-w-lg flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o rol..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#18865b]" /></div><button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#126b47]"><Plus size={17} /> Nuevo usuario</button></div><div className="mb-6 grid gap-4 md:grid-cols-3">{[["Total de usuarios", users.length, "text-[#14243a]", "bg-white"], ["Usuarios activos", active, "text-emerald-700", "bg-emerald-50"], ["Administradores", admins, "text-violet-700", "bg-violet-50"]].map(([label, value, color, background]) => <div key={label} className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${background}`}><p className="text-sm text-slate-500">{label}</p><p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p></div>)}</div><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b border-slate-100 bg-[#f8fafc] text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Usuario", "Correo", "Rol", "Estado", "Acciones"].map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.length ? filtered.map((user) => <tr key={user.id} className="transition hover:bg-emerald-50/30"><td className="px-4 py-4 font-semibold text-[#14243a]">{user.nombre}</td><td className="px-4 py-4 text-slate-600">{user.correo}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.rol === "ADMIN" ? "bg-violet-100 text-violet-800" : user.rol === "CAJERO" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>{user.rol}</span></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.estado ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{user.estado ? "Activo" : "Inactivo"}</span></td><td className="px-4 py-4"><div className="flex gap-1"><button onClick={() => openEdit(user)} title="Editar usuario" className="rounded-lg p-2 text-slate-600 hover:bg-emerald-50 hover:text-[#18865b]"><Pencil size={16} /></button><button onClick={() => toggle(user)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${user.estado ? "bg-red-50 text-red-600" : "bg-emerald-50 text-[#18865b]"}`}>{user.estado ? "Desactivar" : "Activar"}</button></div></td></tr>) : <tr><td colSpan="5" className="px-5 py-14 text-center text-slate-400">No hay usuarios para mostrar</td></tr>}</tbody></table></div>{modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-[#14243a]">{editing ? "Editar usuario" : "Nuevo usuario"}</h3><p className="text-sm text-slate-500">{editing ? "Actualiza datos, rol o estado." : "Crea las credenciales del equipo."}</p></div><button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Nombre completo *<input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">Correo electrónico *<input required type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal" /></label>{!editing && <label className="text-xs font-semibold text-slate-600">Contraseña inicial *<input required minLength="12" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 12 caracteres" className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal" /></label>}{editing && <label className="text-xs font-semibold text-slate-600">Nueva contraseña <input minLength="12" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Déjalo vacío para no cambiarla" className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal" /></label>}<label className="text-xs font-semibold text-slate-600">Rol<select value={form.rol_id} onChange={(e) => setForm({ ...form, rol_id: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal"><option value="1">ADMIN</option><option value="2">CAJERO</option><option value="3">ALMACENISTA</option></select></label>{editing && <label className="text-xs font-semibold text-slate-600">Estado<select value={String(form.estado)} onChange={(e) => setForm({ ...form, estado: e.target.value === "true" })} className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2.5 text-sm font-normal"><option value="true">Activo</option><option value="false">Inactivo</option></select></label>}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#18865b] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear usuario"}</button></div></form></div>}</Resource>;
}

function ConfirmModal({ title, message, confirmLabel, onCancel, onConfirm }) {
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600"><AlertTriangle size={22} /></div>
            <h3 className="text-lg font-bold text-[#14243a]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">{confirmLabel}</button>
            </div>
        </div>
    </div>;
}

function Resource({ title, subtitle, error, children }) { return <div className="mx-auto max-w-[1500px]"><div className="mb-7"><p className="mb-1 text-sm font-semibold text-[#18865b]">Gestión comercial</p><h2 className="text-3xl font-bold tracking-tight">{title}</h2><p className="mt-2 text-sm text-slate-500">{subtitle}</p></div>{error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{children}</div>; }
export default function App() { return <AppErrorBoundary><AuthProvider><Router><Routes><Route path="/login" element={<Login />} /><Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></Router></AuthProvider></AppErrorBoundary>; }
