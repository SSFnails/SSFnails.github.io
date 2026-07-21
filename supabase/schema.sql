-- SSF nails: схема базы данных
-- Выполнить целиком в Supabase: SQL Editor -> New query -> вставить -> Run

-- ТАБЛИЦЫ ---------------------------------------------------------------

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  label text,
  telegram text,
  phone text,
  has_allergy boolean not null default false,
  allergy_note text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  price_plain int not null,
  price_design int,
  is_active boolean not null default true,
  sort int not null default 0
);

create table if not exists slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time time not null,
  status text not null default 'free' check (status in ('free', 'busy', 'blocked')),
  booking_id uuid,
  unique (date, time)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  slot_id uuid references slots(id) on delete set null,
  date date not null,
  time time not null,
  service_id uuid references services(id) on delete set null,
  with_design boolean not null default false,
  extra_design_nails int not null default 0,
  price int not null default 0,
  reference_url text,
  status text not null default 'new' check (status in ('new', 'confirmed', 'done', 'cancelled', 'no_show')),
  address_sent boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ручные доходы и расходы мастера (расходники и прочее)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  type text not null check (type in ('income', 'expense')),
  amount int not null,
  note text,
  created_at timestamptz not null default now()
);

alter table slots
  add constraint slots_booking_fk foreign key (booking_id) references bookings(id) on delete set null;

create index if not exists idx_slots_date on slots(date);
create index if not exists idx_bookings_date on bookings(date);
create index if not exists idx_bookings_client on bookings(client_id);

-- УСЛУГИ И ЦЕНЫ (прайс мастера, дословно) --------------------------------

insert into services (category, name, price_plain, price_design, sort) values
  ('Натуральные ногти', 'Длина до 2', 2000, 2200, 1),
  ('Натуральные ногти', 'Снятие без последующего покрытия', 500, null, 2),
  ('Натуральные ногти', 'Снятие + маникюр без последующего покрытия', 800, null, 3),
  ('Коррекция / наращивание', 'Длина до 2', 2100, 2300, 4),
  ('Коррекция / наращивание', 'Длина до 5', 2700, 3000, 5),
  ('Коррекция / наращивание', 'Длина до 7', 3500, 3700, 6),
  ('Коррекция / наращивание', 'Длина от 8 и более', 4000, 4200, 7);

-- ДОСТУП (RLS) ------------------------------------------------------------
-- Мастер (авторизована) может всё. Клиенты (аноним) видят только
-- активные услуги и свободные окошки, записываются через функцию ниже.

alter table clients enable row level security;
alter table services enable row level security;
alter table slots enable row level security;
alter table bookings enable row level security;
alter table transactions enable row level security;

create policy "master all transactions" on transactions for all to authenticated using (true) with check (true);
create policy "master all clients" on clients for all to authenticated using (true) with check (true);
create policy "master all services" on services for all to authenticated using (true) with check (true);
create policy "master all slots" on slots for all to authenticated using (true) with check (true);
create policy "master all bookings" on bookings for all to authenticated using (true) with check (true);

create policy "public services" on services for select to anon using (is_active);
-- клиенты видят все будущие окошки (занятые показываются перечёркнутыми, без имён)
create policy "public future slots" on slots for select to anon using (date >= current_date);

-- ЗАПИСЬ КЛИЕНТА С ПУБЛИЧНОЙ СТРАНИЦЫ --------------------------------------
-- Атомарно: проверяет что слот ещё свободен, находит или создаёт клиента,
-- создаёт заявку со статусом "новая" и занимает слот.

create or replace function public.create_public_booking(
  p_slot_id uuid,
  p_service_id uuid,
  p_with_design boolean,
  p_name text,
  p_telegram text,
  p_phone text,
  p_reference_url text,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot slots;
  v_client uuid;
  v_booking uuid;
  v_price int;
begin
  if coalesce(trim(p_name), '') = ''
     or coalesce(trim(p_telegram), '') = '' then
    raise exception 'BAD_INPUT';
  end if;

  select * into v_slot from slots where id = p_slot_id and status = 'free' for update;
  if not found then
    raise exception 'SLOT_TAKEN';
  end if;

  if p_service_id is null then
    -- клиентка решит услугу на месте, цену мастер проставит сама
    v_price := 0;
  else
    select case when p_with_design then coalesce(price_design, price_plain) else price_plain end
      into v_price
      from services where id = p_service_id and is_active;
    if v_price is null then
      raise exception 'SERVICE_NOT_FOUND';
    end if;
  end if;

  select id into v_client
    from clients
    where telegram is not null
      and lower(replace(telegram, '@', '')) = lower(replace(trim(p_telegram), '@', ''))
    limit 1;

  if v_client is null then
    insert into clients (name, telegram, phone)
      values (trim(p_name), trim(p_telegram), nullif(trim(p_phone), ''))
      returning id into v_client;
  elsif coalesce(trim(p_phone), '') <> '' then
    -- у постоянной клиентки обновляем телефон, только если она указала новый
    update clients set phone = trim(p_phone) where id = v_client;
  end if;

  insert into bookings (client_id, slot_id, date, time, service_id, with_design, price, reference_url, status, notes)
    values (v_client, p_slot_id, v_slot.date, v_slot.time, p_service_id, p_with_design, v_price, p_reference_url, 'new', nullif(trim(p_note), ''))
    returning id into v_booking;

  update slots set status = 'busy', booking_id = v_booking where id = p_slot_id;

  return v_booking;
end;
$$;

grant execute on function public.create_public_booking to anon, authenticated;

-- ХРАНИЛИЩЕ РЕФЕРЕНСОВ ------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('refs', 'refs', true)
  on conflict (id) do nothing;

create policy "refs upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'refs');

create policy "refs read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'refs');
