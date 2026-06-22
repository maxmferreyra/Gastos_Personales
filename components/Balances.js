import { formatMoney } from '../lib/helpers';

const AVATAR_COLORS = [
  ['#E4EDE9', '#2F6657'],
  ['#FBEFD8', '#8A6420'],
  ['#FBEAEA', '#B23A3A'],
  ['#E4EDE9', '#2F6657'],
  ['#F0EAD9', '#5A5A4E'],
];

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
}

export default function Balances({ autoIncomes }) {
  // Agrupar montos por persona
  const map = {};
  autoIncomes.forEach((i) => {
    const p = i.persona || 'Otros';
    map[p] = (map[p] || 0) + Number(i.monto || 0);
  });
  const people = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const total = people.reduce((s, [, v]) => s + v, 0);

  if (people.length === 0) {
    return (
      <div className="card">
        <div className="card-head">
          <h3><i className="ti ti-users hi" /> Balances por persona</h3>
        </div>
        <div className="empty">Cuando compartas un gasto de tarjeta, vas a ver acá cuánto te debe cada persona.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3><i className="ti ti-users hi" /> Balances por persona</h3>
        <span style={{ fontSize: 13, color: 'var(--gold-600)', fontWeight: 600 }}>
          Total a cobrar {formatMoney(total)}
        </span>
      </div>

      <div className="avatars">
        {people.slice(0, 6).map(([name], i) => {
          const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <div className="avatar" key={name} style={{ background: bg, color: fg }} title={name}>
              {initials(name)}
            </div>
          );
        })}
        {people.length > 6 && (
          <span style={{ fontSize: 11.5, color: 'var(--text-mut)', marginLeft: 12 }}>
            +{people.length - 6} más
          </span>
        )}
      </div>

      <div className="balance-grid">
        {people.map(([name, val]) => (
          <div className="balance-item" key={name}>
            <p className="bn">{name}</p>
            <p className="bv">{formatMoney(val)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
