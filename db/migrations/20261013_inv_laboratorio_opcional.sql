-- =====================================================================
-- FarmaMuni · Producto independiente: el laboratorio es opcional en el
-- producto comercial. Se asigna después (edición o primera compra).
-- Seguro de correr varias veces. No modifica datos.
-- =====================================================================

-- 0. Por si la fase 3 ya se corrió con la versión que exigía laboratorio
alter table public.inv_productos alter column laboratorio_id drop not null;

-- 1. Unicidad: dos comerciales sin laboratorio no repiten nombre + presentación
drop index if exists public.inv_productos_comercial_uq;
create unique index inv_productos_comercial_uq
  on public.inv_productos (
    generico_id,
    coalesce(laboratorio_id, '00000000-0000-0000-0000-000000000000'::uuid),
    public.inv_norm(nombre),
    public.inv_norm(coalesce(presentacion, ''))
  )
  where generico_id is not null;

-- 2. La vista muestra también los comerciales sin laboratorio (left join).
--    Mismas columnas y mismo orden que la versión anterior (1 + 1b).
create or replace view public.v_inv_comerciales
with (security_invoker = true) as
select
  p.id                                                   as producto_id,
  p.nombre                                               as nombre_comercial,
  p.presentacion,
  p.precio_base                                          as precio_venta,
  p.imagen_url,
  p.activo,
  g.id                                                   as generico_id,
  c.nombre || ' ' || g.concentracion || ' ' || g.forma_farmaceutica as generico_nombre,
  g.requiere_receta,
  c.id                                                   as catalogo_id,
  c.nombre                                               as catalogo_nombre,
  lab.id                                                 as laboratorio_id,
  lab.nombre                                             as laboratorio_nombre,
  coalesce(st.stock_vendible, 0)                         as stock_vendible,
  st.proximo_vencimiento,
  coalesce(st.lotes_vendibles, 0)                        as lotes_vendibles,
  g.concentracion,
  g.forma_farmaceutica,
  g.unidad_venta,
  g.stock_minimo,
  g.activo                                               as generico_activo,
  p.descripcion,
  p.created_at
from public.inv_productos p
join public.inv_genericos g            on g.id = p.generico_id
join public.inv_catalogos c            on c.id = g.catalogo_id
left join public.inv_laboratorios lab  on lab.id = p.laboratorio_id
left join lateral (
  select
    sum(l.cantidad_actual)   as stock_vendible,
    min(l.fecha_vencimiento) as proximo_vencimiento,
    count(*)                 as lotes_vendibles
  from public.inv_lotes l
  where l.producto_id = p.id
    and l.activo
    and l.cantidad_actual > 0
    and l.fecha_vencimiento >= (now() at time zone 'America/Guatemala')::date
) st on true;

grant select on public.v_inv_comerciales to authenticated;