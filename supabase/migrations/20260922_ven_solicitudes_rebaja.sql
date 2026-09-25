create table if not exists public.ven_solicitudes_rebaja (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references auth.users (id) on delete cascade,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'rechazada', 'expirada', 'completada')),
  payload jsonb not null,
  venta_id uuid references public.ventas (id),
  resuelto_por uuid references auth.users (id),
  resuelto_at timestamptz,
  motivo_rechazo text,
  created_at timestamptz not null default now()
);

create index if not exists ven_solicitudes_rebaja_pendiente_idx
  on public.ven_solicitudes_rebaja (created_at desc)
  where estado = 'pendiente';

create index if not exists ven_solicitudes_rebaja_solicitante_idx
  on public.ven_solicitudes_rebaja (solicitante_id, created_at desc);

alter table public.ven_solicitudes_rebaja enable row level security;

create or replace function public.is_admin_or_super ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid ()
      and p.rol in ('admin', 'super')
  );
$$;

drop policy if exists ven_solicitudes_rebaja_insert on public.ven_solicitudes_rebaja;
create policy ven_solicitudes_rebaja_insert
  on public.ven_solicitudes_rebaja
  for insert
  to authenticated
  with check (solicitante_id = auth.uid ());

drop policy if exists ven_solicitudes_rebaja_select on public.ven_solicitudes_rebaja;
create policy ven_solicitudes_rebaja_select
  on public.ven_solicitudes_rebaja
  for select
  to authenticated
  using (solicitante_id = auth.uid () or public.is_admin_or_super ());
