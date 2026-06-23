import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Balances from '../components/Balances';
import Incomes from '../components/Incomes';
import PersonalExpenses from '../components/PersonalExpenses';
import HouseExpenses from '../components/HouseExpenses';
import Cards from '../components/Cards';
import Stats from '../components/Stats';
import Login from '../components/Login';
import { MONTH_NAMES, formatMoney } from '../lib/helpers';
import { exportToExcel } from '../lib/exportExcel';
import { getDolarTarjeta } from '../lib/dolar';
import { supabase } from '../lib/supabaseClient';
import * as db from '../lib/data';

export default function Home() {
  // ---------- Auth ----------
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesion
  const [tree, setTree] = useState([]);
  const [selectedMonthId, setSelectedMonthId] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tcDelDia, setTcDelDia] = useState(null);

  // Sesion: leer la actual y suscribirse a cambios
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cotizacion del dolar tarjeta del dia
  useEffect(() => {
    if (!session) return;
    getDolarTarjeta().then((r) => setTcDelDia(r.venta));
  }, [session]);

  // Año al que pertenece el mes seleccionado
  const currentYear = useMemo(
    () => tree.find((y) => y.months.some((m) => m.id === selectedMonthId)),
    [tree, selectedMonthId]
  );

  // ---------- Carga inicial (solo con sesion) ----------
  const loadTree = useCallback(async () => {
    const t = await db.fetchYearsTree();
    setTree(t);
    return t;
  }, []);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        const t = await loadTree();
        const now = new Date();
        let target = null;
        for (const y of t) {
          if (y.year === now.getFullYear()) {
            target = y.months.find((m) => m.month === now.getMonth() + 1);
            if (target) break;
          }
        }
        if (!target) target = t[0]?.months[0];
        setSelectedMonthId(target?.id || null);
      } catch (e) {
        setErr(e.message || 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    })();
  }, [session, loadTree]);

  // ---------- Carga del mes seleccionado ----------
  const reloadMonth = useCallback(async () => {
    if (!selectedMonthId) return;
    const md = await db.fetchMonthData(selectedMonthId);
    setMonthData(md);
  }, [selectedMonthId]);

  const reloadSeries = useCallback(async () => {
    if (!currentYear) return;
    const s = await db.fetchYearSeries(currentYear.id);
    setSeries(s);
  }, [currentYear]);

  useEffect(() => { reloadMonth(); }, [reloadMonth]);
  useEffect(() => { reloadSeries(); }, [reloadSeries, monthData]);

  const run = async (fn) => {
    try {
      await fn();
      await reloadMonth();
    } catch (e) {
      alert('Ocurrio un error: ' + (e.message || e));
    }
  };

  // ---------- Estado de congelado del mes ----------
  const monthFrozen = !!monthData?.month?.tc_congelado;
  const tcCongelado = monthData?.month?.tc_congelado || null;

  // monto en pesos de un gasto de tarjeta (USD usa tc_aplicado o el del dia)
  const cardArs = (e) => {
    if (e.moneda === 'USD') {
      const tc = e.tc_aplicado ?? tcDelDia ?? 0;
      return Number(e.monto_total || 0) * tc;
    }
    return Number(e.monto_total_ars ?? (e.monto_total || 0));
  };

  // ---------- Calculos del mes (todo en pesos) ----------
  const totals = useMemo(() => {
    if (!monthData) return { ingresos: 0, gastos: 0, diferencia: 0 };
    const salary = Number(monthData.month?.salary || 0);
    const incomeSum = monthData.incomes.reduce((s, i) => s + Number(i.monto || 0), 0);
    const ingresos = salary + incomeSum;

    const personal = monthData.personal.reduce((s, e) => s + Number(e.monto || 0), 0);
    const house = monthData.house.reduce((s, e) => s + Number(e.monto_total || 0) / 2, 0);
    const card = monthData.cards.reduce(
      (s, c) =>
        s +
        c.expenses.reduce((ss, e) => {
          const n = (e.compartido_con?.length || 0) + 1;
          return ss + cardArs(e) / n; // mi parte en pesos
        }, 0),
      0
    );
    const gastos = personal + house + card;
    return { ingresos, gastos, diferencia: ingresos - gastos };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthData, tcDelDia]);

  const autoIncomes = monthData?.incomes.filter((i) => i.auto) || [];

  // ---------- Acciones de año ----------
  const handleAddYear = async () => {
    const input = prompt('Que año queres agregar? (ej: 2028)');
    if (!input) return;
    const year = parseInt(input, 10);
    if (!year || year < 2000 || year > 2100) { alert('Año invalido.'); return; }
    try {
      await db.createYear(year);
      const t = await loadTree();
      const newY = t.find((y) => y.year === year);
      if (newY) setSelectedMonthId(newY.months[0]?.id || selectedMonthId);
    } catch (e) {
      alert('No se pudo crear el año: ' + (e.message || e));
    }
  };

  const handleDeleteYear = async (y) => {
    if (!confirm('Eliminar el año ' + y.year + ' y todos sus datos? Esta accion no se puede deshacer.')) return;
    try {
      await db.deleteYear(y.id);
      const t = await loadTree();
      if (y.months.some((m) => m.id === selectedMonthId)) {
        setSelectedMonthId(t[0]?.months[0]?.id || null);
      }
    } catch (e) {
      alert('No se pudo eliminar el año: ' + (e.message || e));
    }
  };

  // ---------- Congelar / descongelar ----------
  const handleFreeze = async () => {
    if (!tcDelDia) { alert('No se pudo obtener la cotizacion del dolar. Proba de nuevo.'); return; }
    if (!confirm('Congelar las conversiones de este mes al dolar tarjeta de hoy (' + formatMoney(tcDelDia) + ')?')) return;
    await run(() => db.freezeMonth(selectedMonthId, tcDelDia));
  };
  const handleUnfreeze = async () => {
    if (!confirm('Descongelar? Las conversiones volveran a actualizarse con el dolar del dia.')) return;
    await run(() => db.unfreezeMonth(selectedMonthId));
  };

  // ---------- Exportar Excel ----------
  const handleExport = async () => {
    try {
      const all = [];
      for (const y of tree) {
        const yearFull = await db.fetchYearFull(y.id, y.year);
        all.push(...yearFull);
      }
      exportToExcel(all, 'gestion-gastos.xlsx');
    } catch (e) {
      alert('No se pudo exportar: ' + (e.message || e));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ---------- Render: estados de auth ----------
  if (session === undefined) {
    return <div className="loader"><div className="spinner" /><span>Cargando...</span></div>;
  }
  if (session === null) {
    return <Login onLogged={() => {}} />;
  }

  if (loading) {
    return (
      <div className="loader">
        <div className="spinner" />
        <span>Cargando tus finanzas...</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="loader">
        <i className="ti ti-alert-triangle" style={{ fontSize: 32, color: 'var(--danger)' }} />
        <span>No se pudieron cargar los datos.</span>
        <span style={{ fontSize: 12, maxWidth: 360, textAlign: 'center' }}>{err}</span>
      </div>
    );
  }

  const selectedMonth = currentYear?.months.find((m) => m.id === selectedMonthId);

  return (
    <div className="app">
      <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
        <i className="ti ti-menu-2" />
      </button>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <Sidebar
        years={tree}
        selectedMonthId={selectedMonthId}
        onSelectMonth={setSelectedMonthId}
        onAddYear={handleAddYear}
        onDeleteYear={handleDeleteYear}
        show={menuOpen}
        onCloseMobile={() => setMenuOpen(false)}
        userEmail={session.user?.email}
        onLogout={handleLogout}
      />

      <main className="main">
        <div className="page-head">
          <div>
            <h2>
              {selectedMonth ? MONTH_NAMES[selectedMonth.month - 1] + ' ' + currentYear.year : 'Gestion de gastos'}
            </h2>
            <p className="sub">Resumen de ingresos y gastos del mes</p>
          </div>
          <button className="btn btn-gold" onClick={handleExport}>
            <i className="ti ti-download" /> Exportar Excel
          </button>
        </div>

        <div className="metrics">
          <div className="metric">
            <div className="mh">
              <span className="mi" style={{ background: 'var(--ok-bg)' }}><i className="ti ti-arrow-down-left" style={{ color: 'var(--ok)' }} /></span>
              <span className="ml">Ingresos</span>
            </div>
            <p className="mv">{formatMoney(totals.ingresos)}</p>
          </div>
          <div className="metric">
            <div className="mh">
              <span className="mi" style={{ background: 'var(--danger-bg)' }}><i className="ti ti-arrow-up-right" style={{ color: 'var(--danger)' }} /></span>
              <span className="ml">Gastos totales</span>
            </div>
            <p className="mv">{formatMoney(totals.gastos)}</p>
          </div>
          <div className="metric">
            <div className="mh">
              <span className="mi" style={{ background: 'var(--gold-100)' }}><i className="ti ti-scale" style={{ color: 'var(--gold-600)' }} /></span>
              <span className="ml">Diferencia</span>
            </div>
            <p className="mv" style={{ color: totals.diferencia >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
              {formatMoney(totals.diferencia)}
            </p>
          </div>
        </div>

        {monthData && (
          <div className="slide-up">
            <Balances autoIncomes={autoIncomes} />

            <Incomes
              salary={monthData.month?.salary}
              incomes={monthData.incomes}
              onSaveSalary={(v) => run(() => db.updateSalary(selectedMonthId, v))}
              onAdd={(p) => run(() => db.addIncome(selectedMonthId, p))}
              onUpdate={(id, p) => run(() => db.updateIncome(id, p))}
              onDelete={(id) => run(() => db.deleteIncome(id))}
            />

            <PersonalExpenses
              items={monthData.personal}
              onAdd={(p) => run(() => db.addPersonal(selectedMonthId, p))}
              onUpdate={(id, p) => run(() => db.updatePersonal(id, p))}
              onDelete={(id) => run(() => db.deletePersonal(id))}
            />

            <HouseExpenses
              items={monthData.house}
              onAdd={(p) => run(() => db.addHouse(selectedMonthId, p))}
              onUpdate={(id, p) => run(() => db.updateHouse(id, p))}
              onDelete={(id) => run(() => db.deleteHouse(id))}
            />

            <Cards
              cards={monthData.cards}
              monthFrozen={monthFrozen}
              tcDelDia={tcDelDia}
              tcCongelado={tcCongelado}
              onAdd={(cardId, p) => run(() => db.addCardExpense(cardId, p))}
              onUpdate={(cardId, expId, p) => run(() => db.updateCardExpense(expId, p))}
              onDelete={(cardId, expId) => run(() => db.deleteCardExpense(expId))}
              onFreeze={handleFreeze}
              onUnfreeze={handleUnfreeze}
            />

            <Stats monthlySeries={series} current={totals} />
          </div>
        )}
      </main>
    </div>
  );
}
