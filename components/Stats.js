import { useEffect, useRef } from 'react';
import { formatMoney, MONTH_SHORT } from '../lib/helpers';

// Carga Chart.js desde CDN una sola vez
function loadChartJs() {
  return new Promise((resolve) => {
    if (window.Chart) return resolve(window.Chart);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = () => resolve(window.Chart);
    document.body.appendChild(s);
  });
}

export default function Stats({ monthlySeries, current }) {
  // monthlySeries: [{ month: 1..12, ingresos, gastos, diferencia }]
  // current: { ingresos, gastos, diferencia } del mes seleccionado
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadChartJs().then((Chart) => {
      if (cancelled || !canvasRef.current) return;
      const labels = monthlySeries.map((m) => MONTH_SHORT[m.month - 1]);
      const data = monthlySeries.map((m) => m.diferencia);
      const colors = monthlySeries.map((m) =>
        m.hasData ? '#D9A441' : '#E4E0D3'
      );

      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Diferencia', data, backgroundColor: colors, borderRadius: 5, maxBarThickness: 42 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => 'Diferencia: $' + Number(c.parsed.y).toLocaleString('es-AR', { maximumFractionDigits: 0 }),
              },
            },
          },
          scales: {
            y: {
              ticks: {
                color: '#8A8470',
                callback: (v) => '$' + (v / 1000000).toFixed(1) + 'M',
              },
              grid: { color: '#F0EDE3' },
            },
            x: { ticks: { color: '#8A8470' }, grid: { display: false } },
          },
          animation: { duration: 500 },
        },
      });
    });
    return () => { cancelled = true; if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [monthlySeries]);

  const ahorroPct = current.ingresos > 0 ? (current.diferencia / current.ingresos) * 100 : 0;

  return (
    <div className="card">
      <div className="card-head">
        <h3><i className="ti ti-chart-bar hi" /> Estadísticas</h3>
        <span style={{ fontSize: 12.5, color: 'var(--text-mut)' }}>Comparación del año</span>
      </div>

      <div className="metrics" style={{ marginBottom: 16 }}>
        <div className="metric">
          <div className="mh">
            <span className="mi" style={{ background: 'var(--ok-bg)' }}><i className="ti ti-pig-money" style={{ color: 'var(--ok)' }} /></span>
            <span className="ml">Me sobra este mes</span>
          </div>
          <p className="mv" style={{ color: current.diferencia >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
            {formatMoney(current.diferencia)}
          </p>
        </div>
        <div className="metric">
          <div className="mh">
            <span className="mi" style={{ background: 'var(--danger-bg)' }}><i className="ti ti-arrow-up-right" style={{ color: 'var(--danger)' }} /></span>
            <span className="ml">Gasté este mes</span>
          </div>
          <p className="mv">{formatMoney(current.gastos)}</p>
        </div>
        <div className="metric">
          <div className="mh">
            <span className="mi" style={{ background: 'var(--gold-100)' }}><i className="ti ti-percentage" style={{ color: 'var(--gold-600)' }} /></span>
            <span className="ml">Tasa de ahorro</span>
          </div>
          <p className="mv">{ahorroPct.toFixed(0)}%</p>
        </div>
      </div>

      <div className="chart-wrap">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Gráfico de barras de la diferencia entre ingresos y gastos por mes del año seleccionado."
        />
      </div>
    </div>
  );
}
