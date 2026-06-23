// Cotización del dólar oficial desde dolarapi.com.
// API pública, sin API key. Devuelve el valor "venta".

const ENDPOINT = 'https://dolarapi.com/v1/dolares/oficial';

// Cache simple en memoria para no pegarle a la API en cada render.
let cache = { value: null, fecha: null, ts: 0 };
const TTL = 10 * 60 * 1000; // 10 minutos

export async function getDolarOficial() {
  const now = Date.now();
  if (cache.value && now - cache.ts < TTL) {
    return { venta: cache.value, fecha: cache.fecha };
  }
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error('No se pudo obtener la cotización');
    const data = await res.json();
    cache = { value: data.venta, fecha: data.fechaActualizacion, ts: now };
    return { venta: data.venta, fecha: data.fechaActualizacion };
  } catch (e) {
    if (cache.value) return { venta: cache.value, fecha: cache.fecha };
    return { venta: null, fecha: null, error: e.message };
  }
}

// Alias retrocompatible por si quedó alguna referencia
export const getDolarTarjeta = getDolarOficial;
