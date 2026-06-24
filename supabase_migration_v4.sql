-- =====================================================================
--  GESTIÓN DE GASTOS — Migración v3
--  Agrega: porcentaje que asumen las personas en gastos de tarjeta
--  compartidos, ingreso calculado por ese %, y renombre de tarjeta.
--
--  Ejecutá este script en: Supabase → SQL Editor → New query
--  Es seguro sobre la base que ya tenés (usa IF NOT EXISTS).
-- =====================================================================

-- ---------- 1. Porcentaje que asumen las personas ----------
-- pct_compartido: 0..100 = qué % del gasto te devuelven entre las personas
-- de "compartido_con". Por defecto 50 (mitad, como funcionaba antes).
alter table card_expenses
  add column if not exists pct_compartido numeric not null default 50;

-- Para los gastos que ya existían con personas, dejamos 50 (mitad);
-- los que no tienen personas, el % es indistinto.

-- ---------- 2. Renombrar tarjeta "Galicia titular" ----------
update cards
set nombre = 'Galicia Maxi adicional'
where nombre = 'Galicia titular';

-- Actualizamos también las funciones que crean tarjetas para años nuevos,
-- así los próximos años usan el nombre nuevo.
create or replace function create_year(p_year integer)
returns uuid
language plpgsql
as $$
declare
  v_year_id  uuid;
  v_month_id uuid;
  m          integer;
  card_name  text;
begin
  insert into years(year) values (p_year)
    on conflict (year) do nothing;
  select id into v_year_id from years where year = p_year;

  for m in 1..12 loop
    insert into months(year_id, month) values (v_year_id, m)
      on conflict (year_id, month) do nothing;
    select id into v_month_id from months where year_id = v_year_id and month = m;

    foreach card_name in array array['Tarjeta Naranja','Galicia Maxi adicional','Galicia Gonza titular'] loop
      insert into cards(month_id, nombre)
      select v_month_id, card_name
      where not exists (
        select 1 from cards where month_id = v_month_id and nombre = card_name
      );
    end loop;
  end loop;

  return v_year_id;
end;
$$;

-- =====================================================================
--  3. Trigger de ingresos: usar el % que asumen las personas
--  El ingreso total = monto_total_ars * (pct_compartido / 100),
--  repartido en partes iguales entre las personas de compartido_con.
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
  pct          numeric;
begin
  select c.month_id into v_month_id from cards c where c.id = new.card_id;

  delete from incomes where source_expense_id = new.id;

  n_personas := coalesce(array_length(new.compartido_con, 1), 0);
  base_ars   := coalesce(new.monto_total_ars, new.monto_total);
  pct        := coalesce(new.pct_compartido, 50);

  if n_personas > 0 and pct > 0 then
    -- total que te devuelven entre todas las personas, dividido en partes iguales
    parte := (base_ars * pct / 100.0) / n_personas;
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
after insert or update of monto_total, monto_total_ars, compartido_con, concepto, pct_compartido on card_expenses
for each row execute function sync_card_expense_incomes();

-- Recalcular ingresos de los gastos compartidos existentes (dispara el trigger)
update card_expenses set pct_compartido = pct_compartido
where coalesce(array_length(compartido_con, 1), 0) > 0;
