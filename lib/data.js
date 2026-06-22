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
      .select('card_id, monto_total, compartido_con')
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
        return s + Number(e.monto_total || 0) / n; // mi parte
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
