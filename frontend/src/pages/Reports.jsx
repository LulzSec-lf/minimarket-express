import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import api from "../services/api";

const money = (value) => `S/ ${Number(value || 0).toFixed(2)}`;

export default function Reports() {
    const [report, setReport] = useState(null);
    const [audit, setAudit] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [summary, auditResponse] = await Promise.all([api.get("/reportes/resumen"), api.get("/reportes/auditoria")]);
            setReport(summary.data);
            setAudit(auditResponse.data);
        } catch (requestError) {
            setError(requestError.response?.data?.mensaje || "No se pudieron cargar los reportes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm font-semibold text-[#18865b]">Gestión comercial</p><h2 className="text-3xl font-bold tracking-tight">Reportes y auditoría</h2><p className="mt-2 text-sm text-slate-500">Consulta resultados generales y las acciones recientes del equipo.</p></div><button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar</button></div>
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {report && <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Ventas confirmadas</p><p className="mt-1 text-3xl font-bold text-[#14243a]">{report.ventas.operaciones}</p><p className="mt-1 text-sm text-[#18865b]">{money(report.ventas.total)}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Compras confirmadas</p><p className="mt-1 text-3xl font-bold text-[#14243a]">{report.compras.operaciones}</p><p className="mt-1 text-sm text-amber-700">{money(report.compras.total)}</p></div><div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm"><p className="text-sm text-red-700">Agotados / bajo stock</p><p className="mt-1 text-3xl font-bold text-red-700">{report.inventario.agotados} / {report.inventario.bajo_stock}</p><p className="mt-1 text-sm text-red-600">Productos a revisar</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm"><p className="text-sm text-emerald-700">Inventario valorizado</p><p className="mt-1 text-3xl font-bold text-emerald-800">{money(report.inventario.valorizacion)}</p><p className="mt-1 text-sm text-emerald-700">A precio de costo</p></div></div><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-[#18865b]" /><h3 className="font-bold">Ventas por método de pago</h3></div><div className="grid gap-3 md:grid-cols-3">{report.caja.map((payment) => <div key={payment.metodo_pago} className="rounded-xl bg-[#f8fafc] p-4"><p className="text-xs font-semibold uppercase text-slate-500">{payment.metodo_pago}</p><p className="mt-1 text-2xl font-bold text-[#14243a]">{money(payment.total)}</p></div>)}</div></div></>}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-4 font-bold">Auditoría reciente</h3><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-100 bg-[#f8fafc] text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Fecha", "Usuario", "Acción", "Entidad", "Resultado"].map((header) => <th key={header} className="px-3 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{audit.length ? audit.map((entry) => <tr key={entry.id}><td className="px-3 py-3 text-slate-600">{new Date(entry.created_at).toLocaleString("es-PE")}</td><td className="px-3 py-3 font-semibold">{entry.usuario_nombre || `Usuario #${entry.usuario_id || "-"}`}</td><td className="px-3 py-3">{entry.accion}</td><td className="px-3 py-3">{entry.entidad || "-"}</td><td className="px-3 py-3 text-slate-500">{entry.detalles?.status ? `HTTP ${entry.detalles.status}` : "-"}</td></tr>) : <tr><td colSpan="5" className="px-3 py-10 text-center text-slate-400">No hay eventos registrados</td></tr>}</tbody></table></div></div>
    </div>;
}
