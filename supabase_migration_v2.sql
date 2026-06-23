-- =====================================================================
--  GESTIÓN DE GASTOS — Migración v2
--  Agrega: soporte de dólares en gastos de tarjeta, congelar conversión
--  por mes, y seguridad (RLS solo para usuarios autenticados).
--
--  Ejecutá este script en: Supabase → SQL Editor → New query
--  Es seguro correrlo sobre la base que ya tenés (usa IF NOT EXISTS).
-- =====================================================================

-- ---------- 1. Dólares en gastos de tarjeta ----------
-- moneda: 'ARS' (default) o 'USD'
-- tc_aplicado: tipo de cambio con el que se convirtió (del día o congelado)
-- monto_total_ars: el monto del gasto YA convertido a pesos (lo calcula la app).
--   Para gastos en ARS es igual a monto_total. Esta columna es la que usan
--   los cálculos y el trigger de ingresos, así todo queda en pesos.
alter table card_expenses
  add column if not exists moneda text not null default 'ARS',
  add column if not exists tc_aplicado numeric,
  add column if not exists monto_total_ars numeric;

-- Para los gastos que ya existían, monto_total_ars = monto_total
update card_expenses set monto_total_ars = monto_total where monto_total_ars is null;

-- ---------- 2. Congelar conversión por mes ----------
-- Guardamos en el mes si las conversiones están congeladas y con qué valor.
alter table months
  add column if not exists tc_congelado numeric,            -- dólar tarjeta congelado del mes
  add column if not exists tc_congelado_fecha timestamptz;  -- cuándo se congeló

-- =====================================================================
--  3. SEGURIDAD — Cerrar RLS a usuarios autenticados
--  Reemplaza las políticas "anon" (acceso público) por políticas que
--  exigen estar logueado. Sin login, no se accede a nada.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['years','months','personal_expenses','house_expenses','cards','card_expenses','incomes'] loop
    -- borrar política pública anterior
    execute format('drop policy if exists "anon_all_%1$s" on %1$s;', t);
    -- nueva política: solo usuarios autenticados
    execute format('drop policy if exists "auth_all_%1$s" on %1$s;', t);
    execute format(
      'create policy "auth_all_%1$s" on %1$s for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- =====================================================================
--  NOTA: crear tu usuario
--  1. Supabase → Authentication → Users → Add user → Create new user
--     Email: tu email real | Password: la que elijas | Auto Confirm: ON
--  2. Supabase → Authentication → Providers → Email:
--     desactivá "Allow new users to sign up" (registro público cerrado)
-- =====================================================================

-- =====================================================================
--  4. Actualizar el trigger de ingresos para que use el monto EN PESOS
--  (monto_total_ars). Así, un gasto compartido en dólares genera el
--  cobro correcto convertido a pesos.
-- =====================================================================

create or replace function sync_card_expense_incomes()
returns trigger
language plpgsql
as $$
declare
  n_personas   integer;
  parte        numeric;
  v_month_id   uuid;
  persona      text;
  base_ars     numeric;
begin
  select c.month_id into v_month_id from cards c where c.id = new.card_id;

  delete from incomes where source_expense_id = new.id;

  n_personas := coalesce(array_length(new.compartido_con, 1), 0);
  -- usamos el monto ya convertido a pesos; si es null, caemos al monto_total
  base_ars := coalesce(new.monto_total_ars, new.monto_total);

  if n_personas > 0 then
    parte := base_ars / (n_personas + 1);
    foreach persona in array new.compartido_con loop
      insert into incomes (month_id, concepto, monto, persona, auto, source_expense_id)
      values (v_month_id, persona || ' · ' || new.concepto, parte, persona, true, new.id);
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_incomes on card_expenses;
create trigger trg_sync_incomes
after insert or update of monto_total, monto_total_ars, compartido_con, concepto on card_expenses
for each row execute function sync_card_expense_incomes();
