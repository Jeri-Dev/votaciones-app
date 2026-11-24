// localStorage puede no estar disponible (o borrarse) dentro del iframe de Apps Script,
// sobre todo en Safari. Nunca debe romper la app: el estado real vive en el servidor.

export const storage = {
  get(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* sin almacenamiento disponible */
    }
  },
};
