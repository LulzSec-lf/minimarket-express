import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ShoppingCart, Store } from "lucide-react";

export default function Login() {
    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setCargando(true);

        const resultado = await login(correo, password);
        setCargando(false);

        if (resultado.success) {
            navigate("/dashboard");
        } else {
            setError(resultado.mensaje);
        }
    };

    return (
        <div className="relative flex min-h-screen min-h-[100svh] items-start justify-center overflow-y-auto bg-[#f5f7fa] p-3 sm:items-center sm:p-4">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#18865b]/10 blur-3xl" />
            <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#14243a]/10 blur-3xl" />
            <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl md:grid-cols-2">
            <div className="hidden flex-col justify-between bg-[#14243a] p-10 text-white md:flex">
                <div><div className="mb-8 flex items-center gap-3"><div className="rounded-xl bg-[#18865b] p-3"><ShoppingCart size={24} /></div><span className="font-bold">Minimarket Express</span></div><h2 className="text-4xl font-bold leading-tight">Gestiona tu negocio con claridad.</h2><p className="mt-4 text-sm leading-6 text-slate-300">Ventas, inventario y compras en un solo lugar.</p></div>
                <p className="text-xs text-slate-400">Software de gestión comercial</p>
            </div>
            <div className="p-5 sm:p-10">
                <div className="text-center mb-8">
                    <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-[#18865b]">
                        <Store size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-[#14243a]">Bienvenido de nuevo</h1>
                    <p className="mt-1 text-sm text-slate-500">Ingresa para continuar con tu jornada</p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Correo electrónico</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <Mail size={18} />
                            </span>
                            <input
                                type="email"
                                required
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                placeholder="correo@minimarket.local"
                                className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-3 pl-10 pr-4 text-sm text-[#14243a] outline-none placeholder:text-slate-400 focus:border-[#18865b] focus:ring-2 focus:ring-[#18865b]/10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Contraseña</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <Lock size={18} />
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-3 pl-10 pr-11 text-sm text-[#14243a] outline-none placeholder:text-slate-400 focus:border-[#18865b] focus:ring-2 focus:ring-[#18865b]/10"
                            />
                            <button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-[#18865b]">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={cargando}
                        className="w-full rounded-xl bg-[#18865b] py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-800/20 transition hover:bg-[#126b47] disabled:opacity-50"
                    >
                        {cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </button>
                </form>
            </div></div>
        </div>
    );
}