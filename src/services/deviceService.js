import { callServer } from './googleScript.js';
import { storage } from '../utils/storage.js';

// En desarrollo, ?station=N permite simular varias tablets en la misma computadora.
const station = new URLSearchParams(window.location.search).get('station');
const TOKEN_KEY = station ? `vi_device_token_${station}` : 'vi_device_token';

export const deviceToken = {
  get: () => storage.get(TOKEN_KEY),
  set: (token) => storage.set(TOKEN_KEY, token),
  clear: () => storage.remove(TOKEN_KEY),
};

const kiosk = (action, payload) => callServer('kioskApi', action, deviceToken.get(), payload || {});

export const deviceService = {
  status: () => kiosk('status'),
  async register(name) {
    const data = await callServer('kioskApi', 'register', null, { name });
    deviceToken.set(data.token);
    return data;
  },
  unlock: () => kiosk('unlock'),
};

export { kiosk };
