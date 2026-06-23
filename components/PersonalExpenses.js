import { useState } from 'react';
import Modal from './Modal';
import { formatMoney, iconForConcept } from '../lib/helpers';

export default function PersonalExpenses({ items, onAdd, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null);

  const blank = { concepto: '', cuota_actual: 1, cuota_total: 1, monto: '', fijo: false };

  const save = (form) => {
    const payload = {
      concepto: form.concepto.trim(),
      cuota_actual: Number(form.cuota_actual) || 1,
      cuota_total: Number(form.cuota_total) || 1,
      monto: Number(form.monto) || 0,
    };
    if (!payload.concepto) return;
    if (editing?.id) {
      onUpdate(editing.id, payload);
    } else {
      // opciones de propagacion: fijo (repetir hasta diciembre) o cuotas (>1)
      const opts = {
        fijo: !!form.fijo,
        cuotas: payload.cuota_total > payload.cuota_actual,
      };
      onAdd(payload, opts);
    }
    setEditing(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3><i className="ti ti-user-dollar hi" /> Gastos personales</h3>
        <button className="btn btn-outline" onClick={() => setEditing(blank)}>
          <i className="ti ti-plus" /> Agregar gasto
        </button>
      </div>

      <div className="tbl">
        <div className="tbl-head" style={{ gridTemplateColumns: '1fr 70px 110px 70px' }}>
          <span>Concepto</span>
          <span>Cuotas</span>
          <span className="right">Monto</span>
          <span />
        </div>

        {items.length === 0 && <div className="empty">Todavía no cargaste gastos personales.</div>}

        {items.map((it) => (
          <div className="tbl-row" key={it.id} style={{ gridTemplateColumns: '1fr 70px 110px 70px' }}>
            <span className="concept">
              <i className={`ti ti-${iconForConcept(it.concepto)}`} />
              <span>{it.concepto}</span>
            </span>
            <span className="cuota-pill">{it.cuota_actual}/{it.cuota_total}</span>
            <span className="right bold">{formatMoney(it.monto)}</span>
            <span className="row-actions">
              <button className="icon-btn" onClick={() => setEditing(it)} aria-label="Editar">
                <i className="ti ti-edit" />
              </button>
              <button className="icon-btn del" onClick={() => onDelete(it.id)} aria-label="Eliminar">
                <i className="ti ti-trash" />
              </button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <ExpenseForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
          isEdit={!!editing.id}
        />
      )}
    </div>
  );
}

function ExpenseForm({ initial, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState({
    concepto: initial.concepto || '',
    cuota_actual: initial.cuota_actual ?? 1,
    cuota_total: initial.cuota_total ?? 1,
    monto: initial.monto ?? '',
    fijo: initial.fijo ?? false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const enCuotas = Number(form.cuota_total) > Number(form.cuota_actual);

  return (
    <Modal title={isEdit ? 'Editar gasto personal' : 'Nuevo gasto personal'} onClose={onCancel}>
      <div className="field">
        <label>Concepto</label>
        <input value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: Natación" autoFocus />
      </div>
      <div className="field">
        <label>Cuotas</label>
        <div className="two">
          <input type="number" min="1" value={form.cuota_actual} onChange={(e) => set('cuota_actual', e.target.value)} placeholder="Actual" />
          <input type="number" min="1" value={form.cuota_total} onChange={(e) => set('cuota_total', e.target.value)} placeholder="Total" />
        </div>
        <div className="small">Cuota actual / total (ej: 1 y 1 si es pago único)</div>
      </div>
      <div className="field">
        <label>Monto</label>
        <input type="number" min="0" value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" />
      </div>

      {!isEdit && (
        <>
          {enCuotas ? (
            <div className="prop-note">
              <i className="ti ti-calendar-repeat" /> Se crearán las cuotas restantes en los meses siguientes (hasta {form.cuota_total}/{form.cuota_total}).
            </div>
          ) : (
            <label className="checkbox-row">
              <input type="checkbox" checked={form.fijo} onChange={(e) => set('fijo', e.target.checked)} />
              <span>Gasto fijo mensual <small>— repetir en los meses siguientes hasta diciembre</small></span>
            </label>
          )}
        </>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel} style={{ color: 'var(--text-mut)' }}>Cancelar</button>
        <button className="btn btn-gold" onClick={() => onSave(form)}>{isEdit ? 'Guardar' : 'Agregar'}</button>
      </div>
    </Modal>
  );
}
