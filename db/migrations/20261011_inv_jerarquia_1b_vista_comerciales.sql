-- =====================================================================
-- FarmaMuni · Fase 1b: agrega columnas a v_inv_comerciales
-- Solo AGREGA columnas al final de la vista (no cambia ni quita las que
-- ya existen). Seguro de correr encima de la fase 1.
-- =====================================================================
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
  -- columnas nuevas (siempre al final)
  g.concentracion,
  g.forma_farmaceutica,
  g.unidad_venta,
  g.stock_minimo,
  g.activo                                               as generico_activo,
  p.descripcion,
  p.created_at
from public.inv_productos p
join public.inv_genericos g       on g.id = p.generico_id
join public.inv_catalogos c       on c.id = g.catalogo_id
join public.inv_laboratorios lab  on lab.id = p.laboratorio_id
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