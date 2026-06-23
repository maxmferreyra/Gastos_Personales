import { useState } from 'react';
import Modal from './Modal';
import ChipsInput from './ChipsInput';
import { formatMoney, iconForConcept } from '../lib/helpers';

// monto compartido = total_ars / (1 + cantidad de personas)
function sharePerPerson(totalArs, personas) {
  const n = (personas?.length || 0) + 1;
  return (Number(totalArs) || 0) / n;
}

// monto del gasto en pesos: si es USD usa el TC (congelado o del dia)
function montoEnPesos(e, tcDelDia) {
  if (e.moneda === 'USD') {
    const tc = e.tc_aplicado ?? tcDelDia ?? 0;
    return Number(e.monto_total || 0) * tc;
  }
  return Number(e.monto_total_ars ?? (e.monto_total || 0));
}

export default function Cards({
  cards,
  monthFrozen,
  tcDelDia,
  tcCongelado,
  onAdd,
  onUpdate,
  onDelete,
  onFreeze,
  onUnfreeze,
}) {
  const [openCards, setOpenCards] = useState(() => {
    const init = {};
    cards.forEach((c, i) => { init[c.id] = i === 0; });
    return init;
  });
  const [editing, setEditing] = useState(null);

  const toggle = (id) => setOpenCards((o) => ({ ...o, [id]: !o[id] }));

  const cardTotal = (c) =>
    c.expenses.reduce((s, e) => s + montoEnPesos(e, tcDelDia), 0);
  const cardOwed = (c) =>
    c.expenses.reduce((s, e) => {
      const personas = e.compartido_con || [];
      const ars = montoEnPesos(e, tcDelDia);
      return s + sharePerPerson(ars, personas) * personas.length;
    }, 0);

  const hayUSD = cards.some((c) => c.expenses.some((e) => e.moneda === 'USD'));

  const save = (form) => {
    const montoTotal = Number(form.monto_total) || 0;
    const esUSD = form.moneda === 'USD';
    const tc = esUSD ? (monthFrozen ? tcCongelado : tcDelDia) : null;
    const montoArs = esUSD ? montoTotal * (tc || 0) : montoTotal;

    const payload = {
      concepto: form.concepto.trim(),
      cuota_actual: Number(form.cuota_actual) || 1,
      cuota_total: Number(form.cuota_total) || 1,
      monto_total: montoTotal,
      moneda: form.moneda,
      tc_aplicado: esUSD ? tc : null,
      monto_total_ars: montoArs,
      compartido_con: form.compartido_con || [],
    };
    if (!payload.concepto) return;
    if (editing.expense) onUpdate(editing.cardId, editing.expense.id, payload);
    else {
      const opts = { cuotas: payload.cuota_total > payload.cuota_actual };
      onAdd(editing.cardId, payload, opts);
    }
    setEditing(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3><i className="ti ti-credit-card hi" /> Tarjetas</h3>
        {tcDelDia != null && (
          <span className="tc-info">
            <i className="ti ti-currency-dollar" /> Dolar oficial: {formatMoney(tcDelDia)}
          </span>
        )}
      </div>

      {hayUSD && (
        <div className="freeze-bar">
          {monthFrozen ? (
            <>
              <span className="fb-text">
                <span className="frozen-badge"><i className="ti ti-snowflake" /> Conversiones congeladas a {formatMoney(tcCongelado)}</span>
              </span>
              <button className="btn btn-outline" onClick={onUnfreeze}>
                <i className="ti ti-flame" /> Descongelar
              </button>
            </>
          ) : (
            <>
              <span className="fb-text">
                <i className="ti ti-info-circle" /> Las conversiones a pesos se actualizan con el dolar del dia.
              </span>
              <button className="btn btn-gold" onClick={onFreeze}>
                <i className="ti ti-snowflake" /> Congelar conversiones del mes
              </button>
            </>
          )}
        </div>
      )}

      {cards.map((c) => {
        const total = cardTotal(c);
        const owed = cardOwed(c);
        const isOpen = openCards[c.id];
        const cardHasUSD = c.expenses.some((e) => e.moneda === 'USD');
        return (
          <div className="cc" key={c.id}>
            <div className="cc-head" onClick={() => toggle(c.id)}>
              <span className="ccname"><i className="ti ti-credit-card" /> {c.nombre}</span>
              <span className="ccright">
                <span style={{ textAlign: 'right' }}>
                  <span className="cc-total">{formatMoney(total)}</span>
                  {owed > 0 && <span className="cc-owe" style={{ display: 'block' }}>Te deben {formatMoney(owed)}</span>}
                </span>
                <i className={`ti ti-chevron-down cc-chev ${isOpen ? 'open' : ''}`} />
              </span>
            </div>

            <div className={`cc-body ${isOpen ? 'open' : ''}`}>
              <div className="cc-inner">
                <div className="tbl-scroll">
                  <div className="tbl">
                    <div className="tbl-head" style={{ gridTemplateColumns: gridCols(cardHasUSD) }}>
                      <span>Concepto</span>
                      <span>Cuotas</span>
                      <span>Compartido con</span>
                      <span className="right">Total</span>
                      {cardHasUSD && <span className="right">En pesos</span>}
                      <span className="right">C/u</span>
                      <span />
                    </div>

                    {c.expenses.length === 0 && (
                      <div className="empty">Sin gastos en esta tarjeta.</div>
                    )}

                    {c.expenses.map((e) => {
                      const personas = e.compartido_con || [];
                      const ars = montoEnPesos(e, tcDelDia);
                      const share = sharePerPerson(ars, personas);
                      return (
                        <div className="tbl-row" key={e.id} style={{ gridTemplateColumns: gridCols(cardHasUSD) }}>
                          <span className="concept">
                            <i className={`ti ti-${iconForConcept(e.concepto)}`} />
                            <span>{e.concepto}</span>
                          </span>
                          <span className="cuota-pill">{e.cuota_actual}/{e.cuota_total}</span>
                          <span className="chips">
                            {personas.length === 0
                              ? <span style={{ color: 'var(--text-mut)', fontSize: 12 }}>—</span>
                              : personas.map((p, i) => <span className="chip" key={i}>{p}</span>)}
                          </span>
                          <span className="right">
                            {e.moneda === 'USD'
                              ? <>US${Number(e.monto_total).toLocaleString('es-AR')}<span className="usd-tag">USD</span></>
                              : formatMoney(e.monto_total)}
                          </span>
                          {cardHasUSD && (
                            <span className="right">
                              {e.moneda === 'USD'
                                ? <>{formatMoney(ars)}{e.tc_aplicado && <i className="ti ti-snowflake" style={{ fontSize: 11, color: 'var(--ok)', marginLeft: 4 }} title={'Congelado a ' + formatMoney(e.tc_aplicado)} />}</>
                                : <span style={{ color: 'var(--text-mut)' }}>—</span>}
                            </span>
                          )}
                          <span className="right money-share">
                            {personas.length > 0 ? formatMoney(share) : <span style={{ color: 'var(--text-mut)' }}>—</span>}
                          </span>
                          <span className="row-actions">
                            <button className="icon-btn" onClick={() => setEditing({ cardId: c.id, expense: e })} aria-label="Editar">
                              <i className="ti ti-edit" />
                            </button>
                            <button className="icon-btn del" onClick={() => onDelete(c.id, e.id)} aria-label="Eliminar">
                              <i className="ti ti-trash" />
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  className="btn btn-outline"
                  style={{ marginTop: 12 }}
                  onClick={() => setEditing({ cardId: c.id, expense: null })}
                >
                  <i className="ti ti-plus" /> Agregar gasto
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {editing && (
        <CardExpenseForm
          initial={editing.expense}
          tcDelDia={tcDelDia}
          tcCongelado={tcCongelado}
          monthFrozen={monthFrozen}
          onCancel={() => setEditing(null)}
          onSave={save}
          isEdit={!!editing.expense}
        />
      )}
    </div>
  );
}

function gridCols(hasUSD) {
  return hasUSD
    ? '1.4fr 56px 1.2fr 120px 120px 100px 56px'
    : '1.4fr 56px 1.4fr 120px 110px 56px';
}

function CardExpenseForm({ initial, tcDelDia, tcCongelado, monthFrozen, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState({
    concepto: initial?.concepto || '',
    cuota_actual: initial?.cuota_actual ?? 1,
    cuota_total: initial?.cuota_total ?? 1,
    monto_total: initial?.monto_total ?? '',
    moneda: initial?.moneda || 'ARS',
    compartido_con: initial?.compartido_con || [],
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const esUSD = form.moneda === 'USD';
  const tc = monthFrozen ? tcCongelado : tcDelDia;
  const montoArs = esUSD ? (Number(form.monto_total) || 0) * (tc || 0) : Number(form.monto_total) || 0;
  const share = sharePerPerson(montoArs, form.compartido_con);

  return (
    <Modal title={isEdit ? 'Editar gasto de tarjeta' : 'Nuevo gasto de tarjeta'} onClose={onCancel}>
      <div className="field">
        <label>Concepto</label>
        <input value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: Apple TV" autoFocus />
      </div>

      <div className="field">
        <label>Moneda</label>
        <div className="seg">
          <button type="button" className={form.moneda === 'ARS' ? 'on' : ''} onClick={() => set('moneda', 'ARS')}>Pesos (ARS)</button>
          <button type="button" className={form.moneda === 'USD' ? 'on' : ''} onClick={() => set('moneda', 'USD')}>Dolares (USD)</button>
        </div>
      </div>

      <div className="field">
        <label>{esUSD ? 'Monto en dolares (USD)' : 'Monto total'}</label>
        <input type="number" min="0" value={form.monto_total} onChange={(e) => set('monto_total', e.target.value)} placeholder="0" />
        {esUSD && (
          <div className="small">
            {tc
              ? <>Conversion a pesos ({monthFrozen ? 'congelado' : 'dolar oficial'} {formatMoney(tc)}): <strong>{formatMoney(montoArs)}</strong></>
              : 'No se pudo obtener la cotizacion del dolar. Proba de nuevo en unos segundos.'}
          </div>
        )}
      </div>

      <div className="field">
        <label>Cuotas</label>
        <div className="two">
          <input type="number" min="1" value={form.cuota_actual} onChange={(e) => set('cuota_actual', e.target.value)} placeholder="Actual" />
          <input type="number" min="1" value={form.cuota_total} onChange={(e) => set('cuota_total', e.target.value)} placeholder="Total" />
        </div>
        {!isEdit && Number(form.cuota_total) > Number(form.cuota_actual) && (
          <div className="prop-note">
            <i className="ti ti-calendar-repeat" /> Se crearán las cuotas restantes en los meses siguientes (hasta {form.cuota_total}/{form.cuota_total}), creando el año próximo si hace falta.
          </div>
        )}
      </div>

      <div className="field">
        <label>Compartido con</label>
        <ChipsInput
          value={form.compartido_con}
          onChange={(v) => set('compartido_con', v)}
          placeholder="Escribi un nombre y Enter"
        />
        <div className="small">
          {form.compartido_con.length > 0
            ? <>Se divide entre vos + {form.compartido_con.length}. Cada persona te paga <strong>{formatMoney(share)}</strong>. Se crea un ingreso por cada uno.</>
            : 'Sin compartir. Si agregas personas, se generan ingresos automaticos.'}
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel} style={{ color: 'var(--text-mut)' }}>Cancelar</button>
        <button className="btn btn-gold" onClick={() => onSave(form)}>{isEdit ? 'Guardar' : 'Agregar'}</button>
      </div>
    </Modal>
  );
}
