import { createContext, useState, useContext, useEffect, useRef } from "react";
import api from "../services/api";
import { getStoredValue, removeStoredValue, setStoredValue } from "../services/storage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const storedToken = getStoredValue("token");
    const [user, setUser] = useState(() => {
        const storedUser = getStoredValue("user");
        try {
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            removeStoredValue("user");
            return null;
        }
    });
    const [token, setToken] = useState(storedToken || null);
    const [loading, setLoading] = useState(Boolean(storedToken));
    const lastActivity = useRef(0);
    const [inactivityWarning, setInactivityWarning] = useState(false);

    useEffect(() => {
        const handleExpiredSession = () => {
            setToken(null);
            setUser(null);
            setLoading(false);
        };
        window.addEventListener("auth:expired", handleExpiredSession);
        if (!storedToken) {
            return () => window.removeEventListener("auth:expired", handleExpiredSession);
        }

        api.get("/auth/perfil")
            .then(({ data }) => {
                if (data.usuario?.rol) {
                    setUser((currentUser) => ({ ...currentUser, ...data.usuario }));
                }
            })
            .catch(() => {
                removeStoredValue("token");
                removeStoredValue("user");
                setToken(null);
                setUser(null);
            })
            .finally(() => setLoading(false));

        return () => window.removeEventListener("auth:expired", handleExpiredSession);
    }, [storedToken]);

    useEffect(() => {
        if (!token) return undefined;

        const inactivityLimit = 15 * 60 * 1000;
        lastActivity.current = Date.now();

        const clearExpiredSession = () => {
            removeStoredValue("token");
            removeStoredValue("user");
            setToken(null);
            setUser(null);
            setLoading(false);
            setInactivityWarning(false);
            window.dispatchEvent(new Event("auth:expired"));
        };
        const registerActivity = () => {
            lastActivity.current = Date.now();
            setInactivityWarning(false);
        };
        const checkInactivity = () => {
            const inactiveFor = Date.now() - lastActivity.current;
            if (inactiveFor >= inactivityLimit) {
                clearExpiredSession();
            } else if (inactiveFor >= inactivityLimit - 60000) {
                setInactivityWarning(true);
            }
        };
        const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"];

        activityEvents.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }));
        document.addEventListener("visibilitychange", checkInactivity);
        const interval = window.setInterval(checkInactivity, 30000);

        return () => {
            activityEvents.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
            document.removeEventListener("visibilitychange", checkInactivity);
            window.clearInterval(interval);
        };
    }, [token]);

    const login = async (correo, password) => {
        try {
            const response = await api.post("/auth/login", { correo, password });
            const { token: newToken, usuario } = response.data;

            setStoredValue("token", newToken);
            setStoredValue("user", JSON.stringify(usuario));
            setToken(newToken);
            setUser(usuario);
            setLoading(false);
            return { success: true };
        } catch (error) {
            const mensaje = error.response?.data?.mensaje
                || (error.request
                    ? "No se pudo conectar con el servidor. Verifica que la PC y la tablet estén en la misma red."
                    : "No se pudo procesar el inicio de sesión");
            return {
                success: false,
                mensaje
            };
        }
    };

    const logout = () => {
        removeStoredValue("token");
        removeStoredValue("user");
        setToken(null);
        setUser(null);
        setLoading(false);
    };

    const continueSession = () => {
        lastActivity.current = Date.now();
        setInactivityWarning(false);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
            {inactivityWarning && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"><h2 className="text-lg font-bold text-[#14243a]">Sesión por expirar</h2><p className="mt-2 text-sm text-slate-500">Tu sesión se cerrará en 60 segundos por inactividad.</p><button onClick={continueSession} className="mt-5 w-full rounded-xl bg-[#18865b] px-4 py-2.5 text-sm font-semibold text-white">Seguir trabajando</button></div></div>}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);