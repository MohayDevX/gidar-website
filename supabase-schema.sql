create table if not exists public.specialists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  bio text not null,
  price text not null default 'تواصل',
  tags text[] not null default '{}',
  contact text,
  mode text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid references public.specialists(id) on delete set null,
  specialist_name text not null,
  client_name text not null,
  contact text not null,
  date text not null,
  mode text not null,
  note text not null default '',
  status text not null default 'جديد',
  created_at timestamptz not null default now()
);

alter table public.specialists
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists specialists_user_id_unique
  on public.specialists(user_id)
  where user_id is not null;

alter table public.specialists enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "الكل يقدر يشوف الأخصائيين" on public.specialists;
drop policy if exists "الكل يقدر يعمل حساب كأخصائي" on public.specialists;
drop policy if exists "الكل يقدر يشوف الحجوزات" on public.appointments;
drop policy if exists "الكل يقدر يحجز" on public.appointments;
drop policy if exists "Anyone can view approved specialists" on public.specialists;
drop policy if exists "Specialists can view their own profile" on public.specialists;
drop policy if exists "Specialists can create their own pending profile" on public.specialists;
drop policy if exists "Specialists can update their own pending profile" on public.specialists;
drop policy if exists "Anyone can submit an appointment" on public.appointments;
drop policy if exists "Specialists can view their own appointments" on public.appointments;

create policy "Anyone can view approved specialists"
  on public.specialists
  for select
  to anon, authenticated
  using (is_approved = true);

create policy "Specialists can view their own profile"
  on public.specialists
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Specialists can create their own pending profile"
  on public.specialists
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and is_approved = false
  );

create policy "Specialists can update their own pending profile"
  on public.specialists
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and is_approved = false
  )
  with check (
    user_id = (select auth.uid())
    and is_approved = false
  );

create policy "Anyone can submit an appointment"
  on public.appointments
  for insert
  to anon, authenticated
  with check (
    specialist_id is not null
    and exists (
      select 1
      from public.specialists
      where id = appointments.specialist_id
        and is_approved = true
    )
  );

create policy "Specialists can view their own appointments"
  on public.appointments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.specialists
      where id = appointments.specialist_id
        and user_id = (select auth.uid())
    )
  );

revoke all on public.specialists from anon, authenticated;
grant select (id, name, title, bio, price, tags, mode, is_approved, created_at)
  on public.specialists to anon, authenticated;
grant select (user_id) on public.specialists to authenticated;
grant insert (user_id, name, title, bio, price, tags, mode)
  on public.specialists to authenticated;
grant update (name, title, bio, price, tags, mode)
  on public.specialists to authenticated;

revoke all on public.appointments from anon, authenticated;
grant insert (specialist_id, specialist_name, client_name, contact, date, mode, note)
  on public.appointments to anon, authenticated;
grant select (specialist_id, specialist_name, client_name, contact, date, mode, note, status, created_at)
  on public.appointments to authenticated;
