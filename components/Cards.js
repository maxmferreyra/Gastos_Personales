import { useState } from 'react';
import Modal from './Modal';
import ChipsInput from './ChipsInput';
import { formatMoney, iconForConcept } from '../lib/helpers';

// monto compartido = total / (1 + cantidad de personas)
function sharePerPerson(total, personas) {
  const n = (personas?.length || 0) + 1;
  return (Number(total) || 0) / n;
}

export default function Cards({ cards, onAdd, onUpdate, onDelete }) {
  // cards: [{ id, nombre, expenses:[...] }]
  const [openCards, setOpenCards] = useState(() => {
    const init = {};
    cards.forEach((c, i) => { init[c.id] = i === 0; });
    return init;
  });
  const [editing, setEditing] = useState(null); // {cardId, expense?}

  const toggle = (id) => setOpenCards((o) => ({ ...o, [id]: !o[id] }));

  const cardTotal = (c) => c.expenses.reduce((s, e) => s + Number(e.monto_total || 0), 0);
  const cardOwed = (c) =>
    c.expenses.reduce((s, e) => {
      const personas = e.compartido_con || [];
      return s + sharePerPerson(e.monto_total, personas) * personas.length;
    }, 0);

  const save = (form) => {
    const payload = {
      concepto: form.concepto.trim(),
      cuota_actual: Number(form.cuota_actual) || 1,
      cuota_total: Number(form.cuota_total) || 1,
      monto_total: Number(form.monto_total) || 0,
      compartido_con: form.compartido_con || [],
    };
    if (!payload.concepto) return;
    if (editing.expense) onUpdate(editing.cardId, editing.expense.id, payload);
    else onAdd(editing.cardId, payload);
    setEditing(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3><i className="ti ti-credit-card hi" /> Tarjetas</h3>
      </div>

      {cards.map((c) => {
        const total = cardTotal(c);
        const owed = cardOwed(c);
        const isOpen = openCards[c.id];
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
                <div className="tbl">
                  <div className="tbl-head" style={{ gridTemplateColumns: '1fr 60px 1fr 110px 110px 60px' }}>
                    <span>Concepto</span>
                    <span>Cuotas</span>
                    <span>Compartido con</span>
                    <span className="right">Total</span>
                    <span className="right">C/u</span>
                    <span />
                  </div>

                  {c.expenses.length === 0 && (
                    <div className="empty">Sin gastos en esta tarjeta.</div>
                  )}

                  {c.expenses.map((e) => {
                    const personas = e.compartido_con || [];
                    const share = sharePerPerson(e.monto_total, personas);
                    return (
                      <div className="tbl-row" key={e.id} style={{ gridTemplateColumns: '1fr 60px 1fr 110px 110px 60px' }}>
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
                        <span className="right">{formatMoney(e.monto_total)}</span>
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
          onCancel={() => setEditing(null)}
          onSave={save}
          isEdit={!!editing.expense}
        />
      )}
    </div>
  );
}

function CardExpenseForm({ initial, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState({
    concepto: initial?.concepto || '',
    cuota_actual: initial?.cuota_actual ?? 1,
    cuota_total: initial?.cuota_total ?? 1,
    monto_total: initial?.monto_total ?? '',
    compartido_con: initial?.compartido_con || [],
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const share = sharePerPerson(form.monto_total, form.compartido_con);

  return (
    <Modal title={isEdit ? 'Editar gasto de tarjeta' : 'Nuevo gasto de tarjeta'} onClose={onCancel}>
      <div className="field">
        <label>Concepto</label>
        <input value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: Apple TV" autoFocus />
      </div>
      <div className="field">
        <label>Cuotas</label>
        <div className="two">
          <input type="number" min="1" value={form.cuota_actual} onChange={(e) => set('cuota_actual', e.target.value)} placeholder="Actual" />
          <input type="number" min="1" value={form.cuota_total} onChange={(e) => set('cuota_total', e.target.value)} placeholder="Total" />
        </div>
      </div>
      <div className="field">
        <label>Monto total</label>
        <input type="number" min="0" value={form.monto_total} onChange={(e) => set('monto_total', e.target.value)} placeholder="0" />
      </div>
      <div className="field">
        <label>Compartido con</label>
        <ChipsInput
          value={form.compartido_con}
          onChange={(v) => set('compartido_con', v)}
          placeholder="Escribí un nombre y Enter"
        />
        <div className="small">
          {form.compartido_con.length > 0
            ? <>Se divide entre vos + {form.compartido_con.length} → cada persona te paga <strong>{formatMoney(share)}</strong>. Se crea un ingreso por cada uno.</>
            : 'Sin compartir. Si agregás personas, se generan ingresos automáticos.'}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel} style={{ color: 'var(--text-mut)' }}>Cancelar</button>
        <button className="btn btn-gold" onClick={() => onSave(form)}>{isEdit ? 'Guardar' : 'Agregar'}</button>
      </div>
    </Modal>
  );
}
