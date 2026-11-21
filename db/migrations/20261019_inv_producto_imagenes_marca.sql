-- FarmaMuni · Hasta 3 imágenes opcionales por marca (producto comercial)

alter table public.inv_productos
  add column if not exists imagen_url_2 text,
  add column if not exists imagen_url_3 text;

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
  p.created_at,
  p.imagen_url_2,
  p.imagen_url_3
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

-- Storage (bucket `farmamuni` creado en el dashboard; límite 200 KB por objeto)
drop policy if exists "farmamuni autenticado all" on storage.objects;
create policy "farmamuni autenticado all"
  on storage.objects for all to authenticated
  using (bucket_id = 'farmamuni')
  with check (bucket_id = 'farmamuni');

drop policy if exists "farmamuni lectura publica" on storage.objects;
create policy "farmamuni lectura publica"
  on storage.objects for select to public
  using (bucket_id = 'farmamuni');
