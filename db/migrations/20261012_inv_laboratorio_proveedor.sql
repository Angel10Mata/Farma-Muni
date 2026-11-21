-- =====================================================================
-- FarmaMuni · Laboratorio ligado a su proveedor habitual
-- El proveedor es opcional: el laboratorio sigue siendo el fabricante.
-- Seguro de correr varias veces. No toca datos existentes.
-- =====================================================================

alter table public.inv_laboratorios
  add column if not exists proveedor_id uuid
  references public.inv_proveedores (id) on delete set null;

create index if not exists inv_laboratorios_proveedor_idx
  on public.inv_laboratorios (proveedor_id);