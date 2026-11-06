const memoryStorage = new Map();

export function getStoredValue(key) {
    try {
        return window.localStorage.getItem(key) ?? memoryStorage.get(key) ?? null;
    } catch {
        return memoryStorage.get(key) ?? null;
    }
}

export function setStoredValue(key, value) {
    memoryStorage.set(key, value);
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Safari puede bloquear localStorage; la sesión continúa en memoria.
    }
}

export function removeStoredValue(key) {
    memoryStorage.delete(key);
    try {
        window.localStorage.removeItem(key);
    } catch {
        // No hay almacenamiento persistente disponible.
    }
}
