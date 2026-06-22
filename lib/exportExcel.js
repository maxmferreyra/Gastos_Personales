import * as XLSX from 'xlsx';
import { MONTH_NAMES, formatMoney } from './helpers';

// Exporta TODOS los meses disponibles a un único .xlsx (una hoja por mes).
// fullData: [{ year, month, salary, personal:[], house:[], cards:[{nombre, expenses:[]}], incomes:[] }]
export function exportToExcel(fullData, fileName = 'gestion-gastos.xlsx') {
  const wb = XLSX.utils.book_new();

  fullData.forEach((md) => {
    const rows = [];
    const monthLabel = `${MONTH_NAMES[md.month - 1]} ${md.year}`;

    rows.push([monthLabel]);
    rows.push([]);

    // Ingresos
    rows.push(['INGRESOS']);
    rows.push(['Concepto', 'Persona', 'Monto', 'Tipo']);
    rows.push(['Sueldo mensual', '', Number(md.salary) || 0, 'fijo']);
    md.incomes.forEach((i) => {
      rows.push([i.concepto, i.persona || '', Number(i.monto) || 0, i.auto ? 'auto (compartido)' : 'manual']);
    });
    const totalIngresos =
      (Number(md.salary) || 0) + md.incomes.reduce((s, i) => s + Number(i.monto || 0), 0);
    rows.push(['', 'Total ingresos', totalIngresos]);
    rows.push([]);

    // Gastos personales
    rows.push(['GASTOS PERSONALES']);
    rows.push(['Concepto', 'Cuotas', 'Monto']);
    md.personal.forEach((e) => {
      rows.push([e.concepto, `${e.cuota_actual}/${e.cuota_total}`, Number(e.monto) || 0]);
    });
    const totalPersonal = md.personal.reduce((s, e) => s + Number(e.monto || 0), 0);
    rows.push(['', 'Total', totalPersonal]);
    rows.push([]);

    // Gastos casa
    rows.push(['GASTOS CASA']);
    rows.push(['Concepto', 'Monto total', 'Compartido (÷2)']);
    md.house.forEach((e) => {
      const tot = Number(e.monto_total) || 0;
      rows.push([e.concepto, tot, tot / 2]);
    });
    const totalCasa = md.house.reduce((s, e) => s + Number(e.monto_total || 0) / 2, 0);
    rows.push(['', 'Total compartido', totalCasa]);
    rows.push([]);

    // Tarjetas
    md.cards.forEach((c) => {
      rows.push([c.nombre.toUpperCase()]);
      rows.push(['Concepto', 'Cuotas', 'Monto total', 'Compartido con', 'C/u']);
      c.expenses.forEach((e) => {
        const personas = e.compartido_con || [];
        const cu = personas.length > 0 ? (Number(e.monto_total) || 0) / (personas.length + 1) : 0;
        rows.push([
          e.concepto,
          `${e.cuota_actual}/${e.cuota_total}`,
          Number(e.monto_total) || 0,
          personas.join(', '),
          cu,
        ]);
      });
      const totalCard = c.expenses.reduce((s, e) => s + Number(e.monto_total || 0), 0);
      rows.push(['', 'Total', totalCard]);
      rows.push([]);
    });

    // Resumen
    const totalGastos =
      totalPersonal +
      totalCasa +
      md.cards.reduce(
        (s, c) =>
          s +
          c.expenses.reduce((ss, e) => {
            const personas = e.compartido_con || [];
            const miParte = personas.length > 0
              ? (Number(e.monto_total) || 0) / (personas.length + 1)
              : Number(e.monto_total) || 0;
            return ss + miParte;
          }, 0),
        0
      );
    rows.push(['RESUMEN']);
    rows.push(['Total ingresos', totalIngresos]);
    rows.push(['Total gastos (mi parte)', totalGastos]);
    rows.push(['Diferencia', totalIngresos - totalGastos]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 14 }];
    const sheetName = `${MONTH_NAMES[md.month - 1].slice(0, 3)} ${md.year}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, fileName);
}
