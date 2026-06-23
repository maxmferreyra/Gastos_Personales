import { useState } from 'react';
import Modal from './Modal';
import { formatMoney, iconForConcept } from '../lib/helpers';

export default function HouseExpenses({ items, onAdd, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null);
  const blank = { concepto: '', monto_total: '', fijo: false };

  const save = (form) => {
    const payload = {
      concepto: form.concepto.trim(),
      monto_total: Number(form.monto_total) || 0,
    };
    if (!payload.concepto) return;
    if (editing?.id) {
      onUpdate(editing.id, payload);
    } else {
      onAdd(payload, { fijo: !!form.fijo });
    }
    setEditing(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3><i className="ti ti-home hi" /> Gastos casa</h3>
        <button className="btn btn-outline" onClick={() => setEditing(blank)}>
          <i className="ti ti-plus" /> Agregar gasto
        </button>
      </div>

      <div className="tbl">
        <div className="tbl-head" style={{ gridTemplateColumns: '1fr 130px 130px 70px' }}>
          <span>Concepto</span>
          <span className="right">Monto total</span>
          <span className="right">Compartido</span>
          <span />
        </div>

        {items.length === 0 && <div className="empty">Todavía no cargaste gastos de la casa.</div>}

        {items.map((it) => (
          <div className="tbl-row" key={it.id} style={{ gridTemplateColumns: '1fr 130px 130px 70px' }}>
            <span className="concept">
              <i className={`ti ti-${iconForConcept(it.concepto)}`} />
              <span>{it.concepto}</span>
            </span>
            <span className="right">{formatMoney(it.monto_total)}</span>
            <span className="right money-share">{formatMoney(it.monto_compartido ?? it.monto_total / 2)}</span>
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
      <p className="hint">El monto compartido se calcula solo: monto total ÷ 2.</p>

      {editing && (
        <HouseForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
          isEdit={!!editing.id}
        />
      )}
    </div>
  );
}

function HouseForm({ initial, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState({
    concepto: initial.concepto || '',
    monto_total: initial.monto_total ?? '',
    fijo: initial.fijo ?? false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const compartido = (Number(form.monto_total) || 0) / 2;

  return (
    <Modal title={isEdit ? 'Editar gasto de casa' : 'Nuevo gasto de casa'} onClose={onCancel}>
      <div className="field">
        <label>Concepto</label>
        <input value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: Alquiler" autoFocus />
      </div>
      <div className="field">
        <label>Monto total</label>
        <input type="number" min="0" value={form.monto_total} onChange={(e) => set('monto_total', e.target.value)} placeholder="0" />
        <div className="small">Compartido (÷2): <strong>{formatMoney(compartido)}</strong></div>
      </div>

      {!isEdit && (
        <label className="checkbox-row">
          <input type="checkbox" checked={form.fijo} onChange={(e) => set('fijo', e.target.checked)} />
          <span>Gasto fijo mensual <small>— repetir en los meses siguientes hasta diciembre</small></span>
        </label>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel} style={{ color: 'var(--text-mut)' }}>Cancelar</button>
        <button className="btn btn-gold" onClick={() => onSave(form)}>{isEdit ? 'Guardar' : 'Agregar'}</button>
      </div>
    </Modal>
  );
}
