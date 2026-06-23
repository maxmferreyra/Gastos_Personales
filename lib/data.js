import { supabase } from './supabaseClient';

// ---------- Estructura de años y meses (para el sidebar) ----------
export async function fetchYearsTree() {
  const { data: years, error } = await supabase
    .from('years')
    .select('id, year, months(id, month)')
    .order('year', { ascending: true });
  if (error) throw error;
  return (years || []).map((y) => ({
    ...y,
    months: (y.months || []).sort((a, b) => a.month - b.month),
  }));
}

// ---------- Datos completos de un mes ----------
export async function fetchMonthData(monthId) {
  const [month, personal, house, cards, incomes] = await Promise.all([
    supabase.from('months').select('*').eq('id', monthId).single(),
    supabase.from('personal_expenses').select('*').eq('month_id', monthId).order('created_at'),
    supabase.from('house_expenses').select('*').eq('month_id', monthId).order('created_at'),
    supabase.from('cards').select('id, nombre, position').eq('month_id', monthId).order('position'),
    supabase.from('incomes').select('*').eq('month_id', monthId).order('created_at'),
  ]);

  if (month.error) throw month.error;

  // gastos de cada tarjeta
  const cardList = cards.data || [];
  const cardIds = cardList.map((c) => c.id);
  let cardExpenses = [];
  if (cardIds.length) {
    const { data, error } = await supabase
      .from('card_expenses')
      .select('*')
      .in('card_id', cardIds)
      .order('created_at');
    if (error) throw error;
    cardExpenses = data || [];
  }

  const cardsWithExpenses = cardList.map((c) => ({
    ...c,
    expenses: cardExpenses.filter((e) => e.card_id === c.id),
  }));

  return {
    month: month.data,
    personal: personal.data || [],
    house: house.data || [],
    cards: cardsWithExpenses,
    incomes: incomes.data || [],
  };
}

// ---------- Sueldo ----------
export async function updateSalary(monthId, salary) {
  const { error } = await supabase.from('months').update({ salary }).eq('id', monthId);
  if (error) throw error;
}

// ---------- Congelar / descongelar conversiones del mes ----------
// Al congelar: guarda el TC del mes y fija tc_aplicado + monto_total_ars en
// cada gasto USD del mes con ese valor.
export async function freezeMonth(monthId, tc) {
  // 1) marcar el mes como congelado
  const { error: e1 } = await supabase
    .from('months')
    .update({ tc_congelado: tc, tc_congelado_fecha: new Date().toISOString() })
    .eq('id', monthId);
  if (e1) throw e1;

  // 2) traer tarjetas del mes y sus gastos USD
  const { data: cards } = await supabase.from('cards').select('id').eq('month_id', monthId);
  const cardIds = (cards || []).map((c) => c.id);
  if (!cardIds.length) return;

  const { data: usdExp } = await supabase
    .from('card_expenses')
    .select('id, monto_total')
    .in('card_id', cardIds)
    .eq('moneda', 'USD');

  // 3) fijar tc_aplicado y monto_total_ars en cada uno (dispara el trigger de ingresos)
  for (const e of usdExp || []) {
    await supabase
      .from('card_expenses')
      .update({ tc_aplicado: tc, monto_total_ars: Number(e.monto_total) * tc })
      .eq('id', e.id);
  }
}

export async function unfreezeMonth(monthId) {
  const { error } = await supabase
    .from('months')
    .update({ tc_congelado: null, tc_congelado_fecha: null })
    .eq('id', monthId);
  if (error) throw error;
}

// ---------- Gastos personales ----------
export async function addPersonal(monthId, payload) {
  const { data, error } = await supabase
    .from('personal_expenses')
    .insert({ month_id: monthId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updatePersonal(id, payload) {
  const { error } = await supabase.from('personal_expenses').update(payload).eq('id', id);
  if (error) throw error;
}
export async function deletePersonal(id) {
  const { error } = await supabase.from('personal_expenses').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Gastos casa ----------
export async function addHouse(monthId, payload) {
  const { data, error } = await supabase
    .from('house_expenses')
    .insert({ month_id: monthId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateHouse(id, payload) {
  const { error } = await supabase.from('house_expenses').update(payload).eq('id', id);
  if (error) throw error;
}
export async function deleteHouse(id) {
  const { error } = await supabase.from('house_expenses').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Gastos de tarjeta ----------
export async function addCardExpense(cardId, payload) {
  const { data, error } = await supabase
    .from('card_expenses')
    .insert({ card_id: cardId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateCardExpense(id, payload) {
  const { error } = await supabase.from('card_expenses').update(payload).eq('id', id);
  if (error) throw error;
}
export async function deleteCardExpense(id) {
  const { error } = await supabase.from('card_expenses').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Ingresos manuales ----------
export async function addIncome(monthId, payload) {
  const { data, error } = await supabase
    .from('incomes')
    .insert({ month_id: monthId, auto: false, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateIncome(id, payload) {
  const { error } = await supabase.from('incomes').update(payload).eq('id', id);
  if (error) throw error;
}
export async function deleteIncome(id) {
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Años ----------
export async function createYear(year) {
  const { error } = await supabase.rpc('create_year', { p_year: year });
  if (error) throw error;
}
export async function deleteYear(yearId) {
  const { error } = await supabase.from('years').delete().eq('id', yearId);
  if (error) throw error;
}

// ---------- Serie anual para el gráfico de estadísticas ----------
// Devuelve, para cada mes del año, la diferencia ingreso - gasto (mi parte).
export async function fetchYearSeries(yearId) {
  // meses del año
  const { data: months, error } = await supabase
    .from('months')
    .select('id, month, salary')
    .eq('year_id', yearId)
    .order('month');
  if (error) throw error;

  const monthIds = (months || []).map((m) => m.id);
  if (monthIds.length === 0) return [];

  // traemos todo lo necesario en paralelo
  const [personal, house, cards, incomes] = await Promise.all([
    supabase.from('personal_expenses').select('month_id, monto').in('month_id', monthIds),
    supabase.from('house_expenses').select('month_id, monto_total').in('month_id', monthIds),
    supabase.from('cards').select('id, month_id').in('month_id', monthIds),
    supabase.from('incomes').select('month_id, monto').in('month_id', monthIds),
  ]);

  const cardList = cards.data || [];
  const cardIds = cardList.map((c) => c.id);
  let cardExp = [];
  if (cardIds.length) {
    const { data } = await supabase
      .from('card_expenses')
      .select('card_id, monto_total, monto_total_ars, compartido_con')
      .in('card_id', cardIds);
    cardExp = data || [];
  }
  const cardMonth = Object.fromEntries(cardList.map((c) => [c.id, c.month_id]));

  return (months || []).map((m) => {
    const personalSum = (personal.data || [])
      .filter((p) => p.month_id === m.id)
      .reduce((s, p) => s + Number(p.monto || 0), 0);
    const houseSum = (house.data || [])
      .filter((h) => h.month_id === m.id)
      .reduce((s, h) => s + Number(h.monto_total || 0) / 2, 0);
    const cardSum = cardExp
      .filter((e) => cardMonth[e.card_id] === m.id)
      .reduce((s, e) => {
        const n = (e.compartido_con?.length || 0) + 1;
        const base = Number(e.monto_total_ars ?? e.monto_total ?? 0);
        return s + base / n; // mi parte en pesos
      }, 0);
    const incomeSum = (incomes.data || [])
      .filter((i) => i.month_id === m.id)
      .reduce((s, i) => s + Number(i.monto || 0), 0);

    const ingresos = Number(m.salary || 0) + incomeSum;
    const gastos = personalSum + houseSum + cardSum;
    const hasData = gastos > 0 || incomeSum > 0 || Number(m.salary || 0) > 0;
    return { month: m.month, ingresos, gastos, diferencia: ingresos - gastos, hasData };
  });
}

// ---------- Datos completos del año (para exportar) ----------
export async function fetchYearFull(yearId, yearNumber) {
  const { data: months } = await supabase
    .from('months')
    .select('id, month, salary')
    .eq('year_id', yearId)
    .order('month');

  const result = [];
  for (const m of months || []) {
    const md = await fetchMonthData(m.id);
    result.push({
      year: yearNumber,
      month: m.month,
      salary: m.salary,
      personal: md.personal,
      house: md.house,
      cards: md.cards,
      incomes: md.incomes,
    });
  }
  return result;
}

// =====================================================================
//  PROPAGACIÓN A MESES SIGUIENTES
//  - Gastos fijos (personales/casa): se replican hasta diciembre del año.
//  - Cuotas: se replican tantos meses como cuotas falten, creando el año
//    siguiente automáticamente si la serie cruza diciembre.
// =====================================================================

// Devuelve {year, month} de un month_id
async function getYearMonth(monthId) {
  const { data, error } = await supabase
    .from('months')
    .select('month, years(year)')
    .eq('id', monthId)
    .single();
  if (error) throw error;
  return { year: data.years.year, month: data.month };
}

// Asegura que un (año, mes) exista y devuelve su month_id.
// Si el año no existe, lo crea con sus 12 meses (vía RPC create_year).
async function ensureMonthId(year, month) {
  // buscar el año
  let { data: y } = await supabase.from('years').select('id').eq('year', year).maybeSingle();
  if (!y) {
    await supabase.rpc('create_year', { p_year: year });
    const res = await supabase.from('years').select('id').eq('year', year).single();
    y = res.data;
  }
  // buscar el mes dentro del año
  const { data: m } = await supabase
    .from('months')
    .select('id')
    .eq('year_id', y.id)
    .eq('month', month)
    .maybeSingle();
  if (m) return m.id;

  // por si el año existía pero faltaba el mes (caso raro)
  const { data: nm } = await supabase
    .from('months')
    .insert({ year_id: y.id, month })
    .select('id')
    .single();
  return nm.id;
}

// Lista de month_ids para una cantidad de meses a partir del mes SIGUIENTE
// al inicial. count = cuántos meses adelante. Crea años si hace falta.
async function nextMonthIds(startYear, startMonth, count) {
  const ids = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < count; i++) {
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    const id = await ensureMonthId(y, m);
    ids.push({ monthId: id, year: y, month: m });
  }
  return ids;
}

// ¿Ya existe un concepto en ese mes? (para no duplicar — opción "solo rellenar")
async function conceptExists(table, monthId, concepto) {
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('month_id', monthId)
    .ilike('concepto', concepto)
    .maybeSingle();
  return !!data;
}

// ---- Propagar un GASTO FIJO personal/casa hasta diciembre del mismo año ----
export async function propagatePersonalFixed(monthId, payload) {
  const { year, month } = await getYearMonth(monthId);
  const count = 12 - month; // meses hasta diciembre
  if (count <= 0) return;
  const targets = await nextMonthIds(year, month, count);
  for (const t of targets) {
    if (t.year !== year) break; // solo hasta diciembre del año actual
    if (await conceptExists('personal_expenses', t.monthId, payload.concepto)) continue;
    await supabase.from('personal_expenses').insert({ month_id: t.monthId, ...payload });
  }
}

export async function propagateHouseFixed(monthId, payload) {
  const { year, month } = await getYearMonth(monthId);
  const count = 12 - month;
  if (count <= 0) return;
  const targets = await nextMonthIds(year, month, count);
  for (const t of targets) {
    if (t.year !== year) break;
    if (await conceptExists('house_expenses', t.monthId, payload.concepto)) continue;
    await supabase.from('house_expenses').insert({ month_id: t.monthId, ...payload });
  }
}

// ---- Propagar CUOTAS de un gasto personal (1/N → 2/N ... N/N) ----
export async function propagatePersonalInstallments(monthId, payload) {
  const total = Number(payload.cuota_total) || 1;
  const actual = Number(payload.cuota_actual) || 1;
  const restantes = total - actual; // cuántas cuotas quedan después de esta
  if (restantes <= 0) return;
  const { year, month } = await getYearMonth(monthId);
  const targets = await nextMonthIds(year, month, restantes);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    await supabase.from('personal_expenses').insert({
      month_id: t.monthId,
      concepto: payload.concepto,
      cuota_actual: actual + i + 1,
      cuota_total: total,
      monto: payload.monto,
    });
  }
}

// ---- Propagar CUOTAS de un gasto de tarjeta ----
// Necesita encontrar la tarjeta del mismo nombre en cada mes destino.
export async function propagateCardInstallments(cardId, payload) {
  const total = Number(payload.cuota_total) || 1;
  const actual = Number(payload.cuota_actual) || 1;
  const restantes = total - actual;
  if (restantes <= 0) return;

  // nombre + mes de la tarjeta original
  const { data: card } = await supabase
    .from('cards')
    .select('nombre, month_id')
    .eq('id', cardId)
    .single();
  const { year, month } = await getYearMonth(card.month_id);
  const targets = await nextMonthIds(year, month, restantes);

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    // buscar la tarjeta del mismo nombre en el mes destino
    const { data: destCard } = await supabase
      .from('cards')
      .select('id')
      .eq('month_id', t.monthId)
      .eq('nombre', card.nombre)
      .maybeSingle();
    if (!destCard) continue; // si no existe esa tarjeta en el mes, la salteamos
    await supabase.from('card_expenses').insert({
      card_id: destCard.id,
      concepto: payload.concepto,
      cuota_actual: actual + i + 1,
      cuota_total: total,
      monto_total: payload.monto_total,
      moneda: payload.moneda || 'ARS',
      tc_aplicado: payload.tc_aplicado ?? null,
      monto_total_ars: payload.monto_total_ars ?? payload.monto_total,
      compartido_con: payload.compartido_con || [],
    });
  }
}
