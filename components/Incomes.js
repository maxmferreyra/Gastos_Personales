import { useState } from 'react';
import Modal from './Modal';
import { formatMoney } from '../lib/helpers';

export default function Incomes({
  salary,
  incomes,        // todos los ingresos del mes (manuales + auto)
  onSaveSalary,
  onAdd,
  onUpdate,
  onDelete,
}) {
  const [salaryEdit, setSalaryEdit] = useState(false);
  const [salaryVal, setSalaryVal] = useState(salary ?? 0);
  const [editing, setEditing] = useState(null);

  const manual = incomes.filter((i) => !i.auto);
  const auto = incomes.filter((i) => i.auto);

  const saveSalary = () => {
    onSaveSalary(Number(salaryVal) || 0);
    setSalaryEdit(false);
  };

  const save = (form) => {
    const payload = { concepto: form.concepto.trim(), monto: Number(form.monto) || 0 };
    if (!payload.concepto) return;
    if (editing?.id) onUpdate(editing.id, payload);
    else onAdd(payload);
    setEditing(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3><i className="ti ti-cash hi" /> Ingresos</h3>
        <button className="btn btn-outline" onClick={() => setEditing({ concepto: '', monto: '' })}>
          <i className="ti ti-plus" /> Agregar ingreso
        </button>
      </div>

      {/* Sueldo */}
      <div className="tbl-row" style={{ gridTemplateColumns: '1fr 160px 70px', borderBottom: '1px solid var(--line)' }}>
        <span className="concept"><i className="ti ti-briefcase" /> <span>Sueldo mensual</span></span>
        {salaryEdit ? (
          <input
            type="number"
            value={salaryVal}
            onChange={(e) => setSalaryVal(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && saveSalary()}
            style={{ padding: '6px 10px', border: '1px solid var(--line-2)', borderRadius: 8, fontSize: 14, textAlign: 'right' }}
          />
        ) : (
          <span className="right bold">{formatMoney(salary)}</span>
        )}
        <span className="right" style={{ opacity: 1 }}>
          {salaryEdit ? (
            <button className="icon-btn" onClick={saveSalary} aria-label="Guardar sueldo"><i className="ti ti-check" /></button>
          ) : (
            <button className="icon-btn" onClick={() => { setSalaryVal(salary ?? 0); setSalaryEdit(true); }} aria-label="Editar sueldo"><i className="ti ti-edit" /></button>
          )}
        </span>
      </div>

      {/* Ingresos manuales */}
      {manual.map((it) => (
        <div className="tbl-row" key={it.id} style={{ gridTemplateColumns: '1fr 160px 70px' }}>
          <span className="concept"><i className="ti ti-plus" /> <span>{it.concepto}</span></span>
          <span className="right plus">+{formatMoney(it.monto)}</span>
          <span className="row-actions">
            <button className="icon-btn" onClick={() => setEditing(it)} aria-label="Editar"><i className="ti ti-edit" /></button>
            <button className="icon-btn del" onClick={() => onDelete(it.id)} aria-label="Eliminar"><i className="ti ti-trash" /></button>
          </span>
        </div>
      ))}

      {/* Cobros automáticos (gastos compartidos) */}
      {auto.length > 0 && (
        <div className="dashed-sep">
          <p className="hint" style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-refresh" /> Cobros pendientes — se generan solos al compartir un gasto de tarjeta
          </p>
          {auto.map((it) => (
            <div className="tbl-row" key={it.id} style={{ gridTemplateColumns: '90px 1fr 130px', borderBottom: 'none', padding: '8px 6px' }}>
              <span className="auto-tag">auto</span>
              <span style={{ fontSize: 13 }}>{it.concepto}</span>
              <span className="right plus">+{formatMoney(it.monto)}</span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <IncomeForm
          initial={editing}
          isEdit={!!editing.id}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function IncomeForm({ initial, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState({ concepto: initial.concepto || '', monto: initial.monto ?? '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal title={isEdit ? 'Editar ingreso' : 'Nuevo ingreso'} onClose={onCancel}>
      <div className="field">
        <label>Concepto</label>
        <input value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: Bono, devolución, freelance" autoFocus />
      </div>
      <div className="field">
        <label>Monto</label>
        <input type="number" min="0" value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel} style={{ color: 'var(--text-mut)' }}>Cancelar</button>
        <button className="btn btn-gold" onClick={() => onSave(form)}>{isEdit ? 'Guardar' : 'Agregar'}</button>
      </div>
    </Modal>
  );
}
