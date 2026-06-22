// Utilidades compartidas

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// Formato de moneda argentino: $1.167.812
export function formatMoney(n) {
  const num = Number(n) || 0;
  return '$' + num.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

// Convierte "12/14" o partes a cuota_actual / cuota_total
export function parseCuota(actual, total) {
  const a = Number(actual) || 1;
  const t = Number(total) || 1;
  return `${a}/${t}`;
}

// Mapeo de palabras clave del concepto → ícono (Tabler outline).
// Devuelve el primer match; si no encuentra, usa un ícono genérico.
const ICON_RULES = [
  { kw: ['alquiler', 'renta'], icon: 'home' },
  { kw: ['expensa'], icon: 'building' },
  { kw: ['luz', 'electric', 'edesur', 'edenor'], icon: 'bulb' },
  { kw: ['agua', 'aysa'], icon: 'droplet' },
  { kw: ['gas', 'metrogas'], icon: 'flame' },
  { kw: ['abl', 'impuesto', 'rentas', 'arba'], icon: 'receipt-tax' },
  { kw: ['internet', 'fibertel', 'wifi'], icon: 'wifi' },
  { kw: ['claro', 'movistar', 'personal', 'telefono', 'celular', 'cel'], icon: 'device-mobile' },
  { kw: ['natacion', 'pileta', 'nado'], icon: 'swimming' },
  { kw: ['tenis', 'padel', 'raqueta'], icon: 'ball-tennis' },
  { kw: ['gym', 'gimnasio', 'crossfit'], icon: 'barbell' },
  { kw: ['vianda', 'comida', 'almuerzo', 'coto', 'carniceria', 'super', 'mercado'], icon: 'tools-kitchen-2' },
  { kw: ['cafe', 'cafetera', 'starbucks', 'lattente'], icon: 'coffee' },
  { kw: ['apple', 'netflix', 'spotify', 'streaming', 'tv', 'disney', 'hbo', 'max'], icon: 'device-tv' },
  { kw: ['adobe', 'anthropic', 'software', 'suscrip', 'play station', 'playstation'], icon: 'device-laptop' },
  { kw: ['vuelo', 'flybondi', 'jetsmart', 'aerolineas', 'avion', 'pasaje'], icon: 'plane' },
  { kw: ['hotel', 'airbnb', 'noche'], icon: 'bed' },
  { kw: ['entrada', 'ticket', 'recital', 'cine', 'show', 'enigma', 'lali'], icon: 'ticket' },
  { kw: ['ropa', 'zapatilla', 'remera', 'campera', 'adidas', 'grimoldi'], icon: 'shirt' },
  { kw: ['regalo', 'cumple'], icon: 'gift' },
  { kw: ['nafta', 'ypf', 'combustible', 'shell'], icon: 'gas-station' },
  { kw: ['heladera', 'lavarropas', 'electrodomestico', 'cetrogar', 'fravega', 'air fryer'], icon: 'fridge' },
  { kw: ['farmacia', 'farmacity', 'remedio', 'medic'], icon: 'pill' },
  { kw: ['dolar', 'dolares', 'usd', 'ahorro'], icon: 'currency-dollar' },
  { kw: ['mantenimiento', 'cuenta', 'banco'], icon: 'building-bank' },
  { kw: ['mercado pago', 'mercado libre', 'mercado'], icon: 'shopping-cart' },
];

export function iconForConcept(concepto = '') {
  const c = concepto.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.kw.some((k) => c.includes(k))) return rule.icon;
  }
  return 'circle-dot'; // genérico de respaldo
}
