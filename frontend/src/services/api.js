import axios from "axios";
import { getStoredValue, removeStoredValue } from "./storage";

const browserHost = window.location.hostname;
const localNetworkBaseUrl = `${window.location.protocol}//${browserHost}:4000/api`;
const configuredBaseUrl = import.meta.env.VITE_API_URL;
const configuredForLocalComputer = configuredBaseUrl && /\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(configuredBaseUrl);

const api = axios.create({
    baseURL: configuredBaseUrl && !configuredForLocalComputer ? configuredBaseUrl : localNetworkBaseUrl,
    timeout: 10000,
    headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
    const token = getStoredValue("token");
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            removeStoredValue("token");
            removeStoredValue("user");
            window.dispatchEvent(new Event("auth:expired"));
        }
        return Promise.reject(error);
    }
);

export default api;
