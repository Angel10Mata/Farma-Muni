alter table public.inv_proveedores
  add column if not exists activo boolean not null default true;

create index if not exists inv_proveedores_activo_idx
  on public.inv_proveedores (activo);
