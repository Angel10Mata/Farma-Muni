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

create table if not exists public.ven_ventas_bitacora (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id),
  accion text not null
    check (accion in ('editar_linea', 'quitar_linea', 'anular')),
  motivo text not null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ven_ventas_bitacora_venta_idx
  on public.ven_ventas_bitacora (venta_id, created_at desc);

alter table public.ven_ventas_bitacora enable row level security;

drop policy if exists ven_ventas_bitacora_select on public.ven_ventas_bitacora;
create policy ven_ventas_bitacora_select
  on public.ven_ventas_bitacora
  for select
  to authenticated
  using (public.is_admin_or_super ());

drop policy if exists ven_ventas_bitacora_insert on public.ven_ventas_bitacora;
create policy ven_ventas_bitacora_insert
  on public.ven_ventas_bitacora
  for insert
  to authenticated
  with check (usuario_id = auth.uid ());
