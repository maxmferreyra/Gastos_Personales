import { useState } from 'react';
import { MONTH_NAMES } from '../lib/helpers';

export default function Sidebar({
  years,            // [{id, year, months:[{id, month}]}]
  selectedMonthId,
  onSelectMonth,
  onAddYear,
  onDeleteYear,
  show,
  onCloseMobile,
  userEmail,
  onLogout,
}) {
  // Qué años están expandidos. Por defecto, el primero abierto.
  const [open, setOpen] = useState(() => {
    const init = {};
    if (years[0]) init[years[0].id] = true;
    return init;
  });

  const toggle = (id) =>
    setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <aside className={`sidebar ${show ? 'show' : ''}`}>
      <div className="sidebar-brand">
        <div className="logo"><i className="ti ti-wallet" /></div>
        <h1>Gestión<br />de gastos</h1>
      </div>

      {years.map((y) => (
        <div key={y.id}>
          <div className="year-row" onClick={() => toggle(y.id)}>
            <i className={`ti ti-chevron-right chev ${open[y.id] ? 'open' : ''}`} />
            {y.year}
            <i
              className="ti ti-trash ydel"
              title="Eliminar año"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteYear(y);
              }}
            />
          </div>
          <div className={`months ${open[y.id] ? 'open' : ''}`}>
            {y.months
              .slice()
              .sort((a, b) => a.month - b.month)
              .map((m) => (
                <div
                  key={m.id}
                  className={`month-item ${m.id === selectedMonthId ? 'active' : ''}`}
                  onClick={() => {
                    onSelectMonth(m.id);
                    onCloseMobile?.();
                  }}
                >
                  {MONTH_NAMES[m.month - 1]}
                </div>
              ))}
          </div>
        </div>
      ))}

      <button className="add-year-btn" onClick={onAddYear}>
        <i className="ti ti-plus" /> Agregar año
      </button>

      <div className="sidebar-foot">
        {userEmail && <div className="user-chip"><i className="ti ti-user" /> {userEmail}</div>}
        <button className="logout-btn" onClick={onLogout}>
          <i className="ti ti-logout" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
