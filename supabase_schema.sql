-- =====================================================================
--  GESTIÓN DE GASTOS — Esquema de base de datos para Supabase
--  Ejecutá este script completo en: Supabase → SQL Editor → New query
-- =====================================================================

-- ---------- Limpieza opcional (descomentar si querés reiniciar) --------
-- drop table if exists card_expense_shares cascade;
-- drop table if exists card_expenses cascade;
-- drop table if exists incomes cascade;
-- drop table if exists house_expenses cascade;
-- drop table if exists personal_expenses cascade;
-- drop table if exists cards cascade;
-- drop table if exists months cascade;
-- drop table if exists years cascade;

-- =====================================================================
--  TABLAS PRINCIPALES
-- =====================================================================

-- Años (2026, 2027, ...)
create table if not exists years (
  id          uuid primary key default gen_random_uuid(),
  year        integer not null unique,
  created_at  timestamptz default now()
);

-- Meses dentro de cada año (1..12)
create table if not exists months (
  id          uuid primary key default gen_random_uuid(),
  year_id     uuid not null references years(id) on delete cascade,
  month       integer not null check (month between 1 and 12),
  salary      numeric default 0,            -- sueldo mensual
  created_at  timestamptz default now(),
  unique (year_id, month)
);

-- Gastos personales: Concepto, cuotas, monto
create table if not exists personal_expenses (
  id          uuid primary key default gen_random_uuid(),
  month_id    uuid not null references months(id) on delete cascade,
  concepto    text not null,
  cuota_actual integer default 1,
  cuota_total  integer default 1,
  monto       numeric not null default 0,
  position    integer default 0,
  created_at  timestamptz default now()
);

-- Gastos casa: Concepto, monto total, monto compartido (= total / 2)
create table if not exists house_expenses (
  id            uuid primary key default gen_random_uuid(),
  month_id      uuid not null references months(id) on delete cascade,
  concepto      text not null,
  monto_total   numeric not null default 0,
  -- columna generada: siempre la mitad del total
  monto_compartido numeric generated always as (monto_total / 2) stored,
  position      integer default 0,
  created_at    timestamptz default now()
);

-- Tarjetas fijas del mes (Naranja, Galicia titular, Galicia Gonza titular)
create table if not exists cards (
  id          uuid primary key default gen_random_uuid(),
  month_id    uuid not null references months(id) on delete cascade,
  nombre      text not null,
  position    integer default 0,
  created_at  timestamptz default now()
);

-- Gastos de tarjeta: Concepto, cuotas, compartido con (N personas), monto total.
-- monto_compartido = monto_total / (1 + cantidad de personas en "compartido con")
create table if not exists card_expenses (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references cards(id) on delete cascade,
  concepto      text not null,
  cuota_actual  integer default 1,
  cuota_total   integer default 1,
  monto_total   numeric not null default 0,
  compartido_con text[] default '{}',   -- ej: {'Gonza','Tebi'}
  position      integer default 0,
  created_at    timestamptz default now()
);

-- Ingresos: sueldo se guarda en months.salary; acá van los ingresos manuales
-- y los AUTOMÁTICOS generados por gastos de tarjeta compartidos.
create table if not exists incomes (
  id              uuid primary key default gen_random_uuid(),
  month_id        uuid not null references months(id) on delete cascade,
  concepto        text not null,
  monto           numeric not null default 0,
  persona         text,                 -- a quién corresponde (si es automático)
  auto            boolean default false,-- true = generado por gasto compartido
  source_expense_id uuid references card_expenses(id) on delete cascade,
  created_at      timestamptz default now()
);

-- =====================================================================
--  ÍNDICES
-- =====================================================================
create index if not exists idx_months_year on months(year_id);
create index if not exists idx_personal_month on personal_expenses(month_id);
create index if not exists idx_house_month on house_expenses(month_id);
create index if not exists idx_cards_month on cards(month_id);
create index if not exists idx_cardexp_card on card_expenses(card_id);
create index if not exists idx_incomes_month on incomes(month_id);
create index if not exists idx_incomes_source on incomes(source_expense_id);

-- =====================================================================
--  SINCRONIZACIÓN AUTOMÁTICA
--  Cuando un gasto de tarjeta tiene personas en "compartido con",
--  cada persona genera (o actualiza) un ingreso automático ligado al gasto.
--  Si el gasto cambia → los ingresos se recalculan.
--  Si el gasto se borra → los ingresos se borran (vía ON DELETE CASCADE).
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
begin
  -- month_id de la tarjeta del gasto
  select c.month_id into v_month_id
  from cards c
  where c.id = new.card_id;

  -- borramos los ingresos automáticos previos de este gasto
  delete from incomes where source_expense_id = new.id;

  n_personas := coalesce(array_length(new.compartido_con, 1), 0);

  -- si hay personas, repartimos: cada persona paga monto_total / (yo + personas)
  if n_personas > 0 then
    parte := new.monto_total / (n_personas + 1);
    foreach persona in array new.compartido_con loop
      insert into incomes (month_id, concepto, monto, persona, auto, source_expense_id)
      values (
        v_month_id,
        persona || ' · ' || new.concepto,
        parte,
        persona,
        true,
        new.id
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_incomes on card_expenses;
create trigger trg_sync_incomes
after insert or update of monto_total, compartido_con, concepto on card_expenses
for each row execute function sync_card_expense_incomes();

-- =====================================================================
--  SEED — Crear 2026 (junio a diciembre) y sus tarjetas vacías
-- =====================================================================

do $$
declare
  v_year_id  uuid;
  v_month_id uuid;
  m          integer;
  card_name  text;
begin
  -- Año 2026
  insert into years(year) values (2026)
    on conflict (year) do nothing;
  select id into v_year_id from years where year = 2026;

  -- Meses junio(6) a diciembre(12)
  for m in 6..12 loop
    insert into months(year_id, month) values (v_year_id, m)
      on conflict (year_id, month) do nothing;
    select id into v_month_id from months where year_id = v_year_id and month = m;

    -- 3 tarjetas por mes
    foreach card_name in array array['Tarjeta Naranja','Galicia titular','Galicia Gonza titular'] loop
      insert into cards(month_id, nombre)
      select v_month_id, card_name
      where not exists (
        select 1 from cards where month_id = v_month_id and nombre = card_name
      );
    end loop;
  end loop;
end $$;

-- =====================================================================
--  POLÍTICAS RLS (uso personal, sin login)
--  Habilitamos RLS y damos acceso público mediante la anon key.
--  Como la app es de uso personal y no tiene login, esto permite
--  leer/escribir con la clave anónima. La app NO debe ser pública.
-- =====================================================================

alter table years              enable row level security;
alter table months             enable row level security;
alter table personal_expenses  enable row level security;
alter table house_expenses     enable row level security;
alter table cards              enable row level security;
alter table card_expenses      enable row level security;
alter table incomes            enable row level security;

do $$
declare t text;
begin
  foreach t in array array['years','months','personal_expenses','house_expenses','cards','card_expenses','incomes'] loop
    execute format('drop policy if exists "anon_all_%1$s" on %1$s;', t);
    execute format('create policy "anon_all_%1$s" on %1$s for all using (true) with check (true);', t);
  end loop;
end $$;

-- =====================================================================
--  FUNCIÓN para crear un año nuevo con sus 12 meses + tarjetas
--  La app la llama vía RPC cuando tocás "Agregar año".
-- =====================================================================

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

    foreach card_name in array array['Tarjeta Naranja','Galicia titular','Galicia Gonza titular'] loop
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
