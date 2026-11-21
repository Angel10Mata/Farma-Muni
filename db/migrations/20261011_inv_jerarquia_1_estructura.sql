-- =====================================================================
-- FarmaMuni · Jerarquía de inventario · FASE 1: estructura + datos
--
--   Catálogo (principio activo)        inv_catalogos       NUEVA
--     └ Genérico (concentración+forma) inv_genericos       NUEVA
--         └ Laboratorio                inv_laboratorios    NUEVA
--             └ Producto comercial     inv_productos       (se reutiliza)
--                 └ Lotes              inv_lotes           (sin cambios de estructura)
--
-- Por qué se reutiliza inv_productos como "producto comercial":
--   ven_detalles, inv_lotes, inv_compras_detalles e inv_movimientos ya
--   apuntan a inv_productos.id. Mantener esa tabla evita reescribir el
--   historial de ventas, compras y kardex.
--
-- Esta fase NO borra columnas. La app actual sigue funcionando.
-- Las columnas viejas se eliminan en la fase 3, cuando el código ya use
-- la jerarquía nueva.
--
-- Ejecutar en una COPIA de la base primero. Todo corre en una transacción:
-- si algo falla, no queda nada a medias.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Normalización de nombres (minúsculas, sin tildes, espacios simples)
-- ---------------------------------------------------------------------
create or replace function public.inv_norm(texto text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(trim(regexp_replace(
    translate(coalesce(texto, ''), 'ÁÉÍÓÚÜáéíóúü', 'AEIOUUaeiouu'),
    '\s+', ' ', 'g')));
$$;

-- ---------------------------------------------------------------------
-- 1. Tablas nuevas
-- ---------------------------------------------------------------------
create table if not exists public.inv_catalogos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (trim(nombre) <> ''),        -- principio activo: "Acetaminofén"
  descripcion text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists inv_catalogos_nombre_uq
  on public.inv_catalogos (public.inv_norm(nombre));

create table if not exists public.inv_genericos (
  id                 uuid primary key default gen_random_uuid(),
  catalogo_id        uuid not null references public.inv_catalogos (id) on delete restrict,
  concentracion      text not null check (trim(concentracion) <> ''),       -- "500 mg"
  forma_farmaceutica text not null check (trim(forma_farmaceutica) <> ''),  -- "tableta"
  unidad_venta       text not null default 'unidad',
  requiere_receta    boolean not null default false,
  stock_minimo       numeric not null default 0 check (stock_minimo >= 0),  -- alerta por genérico
  activo             boolean not null default true,
  created_at         timestamptz not null default now()
);
create unique index if not exists inv_genericos_uq
  on public.inv_genericos (catalogo_id, public.inv_norm(concentracion), public.inv_norm(forma_farmaceutica));
create index if not exists inv_genericos_catalogo_idx on public.inv_genericos (catalogo_id);

create table if not exists public.inv_laboratorios (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (trim(nombre) <> ''),
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists inv_laboratorios_nombre_uq
  on public.inv_laboratorios (public.inv_norm(nombre));

-- ---------------------------------------------------------------------
-- 2. inv_productos pasa a ser el PRODUCTO COMERCIAL
--    precio_base = precio de venta del producto comercial
--    El código de barras sigue siendo de cada lote (inv_lotes.codigo_barras).
-- ---------------------------------------------------------------------
alter table public.inv_productos
  add column if not exists generico_id    uuid references public.inv_genericos (id) on delete restrict,
  add column if not exists laboratorio_id uuid references public.inv_laboratorios (id) on delete restrict;

create index if not exists inv_productos_generico_idx    on public.inv_productos (generico_id);
create index if not exists inv_productos_laboratorio_idx on public.inv_productos (laboratorio_id);

-- La regla vieja "un solo producto por genérico+concentración+forma+presentación"
-- ya no aplica: ahora varios laboratorios venden el mismo genérico.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.inv_productos'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%nombre_generico%'
  loop
    execute format('alter table public.inv_productos drop constraint %I', r.conname);
    raise notice 'Restricción única vieja eliminada: %', r.conname;
  end loop;

  for r in
    select i.indexrelid::regclass::text as nombre
    from pg_index i
    where i.indrelid = 'public.inv_productos'::regclass
      and i.indisunique
      and not i.indisprimary
      and pg_get_indexdef(i.indexrelid) ilike '%nombre_generico%'
  loop
    execute format('drop index %s', r.nombre);
    raise notice 'Índice único viejo eliminado: %', r.nombre;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Datos: catálogos y genéricos a partir de los productos actuales
-- ---------------------------------------------------------------------
-- Las secciones 3, 4 y 5 van dentro de UN solo bloque DO: así son atómicas y las
-- tablas temporales viven todo el bloque aunque el editor SQL ejecute cada
-- sentencia por separado (el SQL Editor de Supabase lo hace).
do $migracion$
begin

create temp table tmp_prod on commit drop as
select
  p.id,
  coalesce(nullif(trim(p.nombre_generico), ''), trim(p.nombre)) as cat_nombre,
  coalesce(nullif(trim(p.concentracion), ''), 'N/D')            as conc,
  coalesce(nullif(trim(p.forma_farmaceutica), ''), 'otro')      as forma
from public.inv_productos p
where p.generico_id is null;

insert into public.inv_catalogos (nombre)
select distinct on (public.inv_norm(t.cat_nombre)) t.cat_nombre
from tmp_prod t
join public.inv_productos p on p.id = t.id
order by public.inv_norm(t.cat_nombre), p.created_at
on conflict do nothing;

insert into public.inv_genericos
  (catalogo_id, concentracion, forma_farmaceutica, unidad_venta, requiere_receta, stock_minimo)
select
  c.id,
  (array_agg(t.conc  order by p.created_at))[1],   -- se conserva la primera escritura registrada
  (array_agg(t.forma order by p.created_at))[1],
  (array_agg(p.unidad_venta order by p.created_at))[1],
  bool_or(coalesce(p.requiere_receta, false)),
  max(coalesce(p.stock_minimo, 0))
from tmp_prod t
join public.inv_productos p on p.id = t.id
join public.inv_catalogos c on public.inv_norm(c.nombre) = public.inv_norm(t.cat_nombre)
group by c.id, public.inv_norm(t.conc), public.inv_norm(t.forma)
on conflict do nothing;

update public.inv_productos p
set generico_id = g.id
from tmp_prod t
join public.inv_catalogos c on public.inv_norm(c.nombre) = public.inv_norm(t.cat_nombre)
join public.inv_genericos g
  on g.catalogo_id = c.id
 and public.inv_norm(g.concentracion)      = public.inv_norm(t.conc)
 and public.inv_norm(g.forma_farmaceutica) = public.inv_norm(t.forma)
where p.id = t.id;

-- ---------------------------------------------------------------------
-- 4. Datos: laboratorios a partir del texto inv_lotes.laboratorio
-- ---------------------------------------------------------------------
insert into public.inv_laboratorios (nombre)
select distinct on (public.inv_norm(l.laboratorio)) trim(l.laboratorio)
from public.inv_lotes l
where coalesce(trim(l.laboratorio), '') <> ''
order by public.inv_norm(l.laboratorio), l.created_at
on conflict do nothing;

insert into public.inv_laboratorios (nombre) values ('Sin laboratorio')
on conflict do nothing;

-- Laboratorio de cada lote de los productos que se están migrando
create temp table tmp_lote_lab on commit drop as
select
  l.id          as lote_id,
  l.producto_id,
  lab.id        as laboratorio_id,
  l.created_at
from public.inv_lotes l
join tmp_prod t on t.id = l.producto_id
join public.inv_laboratorios lab
  on public.inv_norm(lab.nombre) = public.inv_norm(coalesce(nullif(trim(l.laboratorio), ''), 'Sin laboratorio'));

-- Un producto actual con lotes de N laboratorios => N productos comerciales.
-- El laboratorio con más lotes (desempate: el más reciente) conserva el producto original.
create temp table tmp_split on commit drop as
select
  producto_id,
  laboratorio_id,
  row_number() over (partition by producto_id order by count(*) desc, max(created_at) desc nulls last) as orden,
  null::uuid as nuevo_id
from tmp_lote_lab
group by producto_id, laboratorio_id;

update tmp_split set nuevo_id = gen_random_uuid() where orden > 1;

update public.inv_productos p
set laboratorio_id = s.laboratorio_id
from tmp_split s
where s.producto_id = p.id and s.orden = 1;

-- Productos sin lotes todavía
update public.inv_productos p
set laboratorio_id = (select id from public.inv_laboratorios where public.inv_norm(nombre) = 'sin laboratorio')
where p.laboratorio_id is null
  and p.id in (select id from tmp_prod);

-- Clones: un producto comercial nuevo por cada laboratorio adicional
insert into public.inv_productos (
  id, created_at, nombre, descripcion, precio_base, stock_actual, stock_minimo, activo,
  proveedor_id, imagen_url, nombre_generico, concentracion, forma_farmaceutica,
  presentacion, unidad_venta, requiere_receta, generico_id, laboratorio_id
)
select
  s.nuevo_id, now(), p.nombre, p.descripcion, p.precio_base, 0, p.stock_minimo, p.activo,
  p.proveedor_id, p.imagen_url, p.nombre_generico, p.concentracion, p.forma_farmaceutica,
  p.presentacion, p.unidad_venta, p.requiere_receta, p.generico_id, s.laboratorio_id
from tmp_split s
join public.inv_productos p on p.id = s.producto_id
where s.orden > 1;

-- Mover los lotes de esos laboratorios a su nuevo producto comercial
create temp table tmp_lote_movido on commit drop as
select ll.lote_id, s.nuevo_id
from tmp_lote_lab ll
join tmp_split s on s.producto_id = ll.producto_id and s.laboratorio_id = ll.laboratorio_id
where s.orden > 1;

update public.inv_lotes l
set producto_id = m.nuevo_id
from tmp_lote_movido m
where l.id = m.lote_id;

-- Historial de ventas y compras de esos lotes: apuntar al producto correcto.
-- inv_movimientos (kardex) NO se toca: es inmutable y conserva el lote_id,
-- que ya identifica el producto comercial actual.
update public.ven_detalles d
set producto_id = m.nuevo_id
from tmp_lote_movido m
where d.lote_id = m.lote_id;

update public.inv_compras_detalles cd
set producto_id = m.nuevo_id
from tmp_lote_movido m
join public.inv_lotes l on l.id = m.lote_id
where cd.id = l.compra_detalle_id;

-- ---------------------------------------------------------------------
-- 5. Precio y stock del producto comercial
-- ---------------------------------------------------------------------
-- Precio = el mayor precio de venta entre sus lotes activos (nunca baja el precio actual del lote).
update public.inv_productos p
set precio_base = x.precio
from (
  select producto_id, max(precio_venta) as precio
  from public.inv_lotes
  where activo and precio_venta is not null
  group by producto_id
) x
where x.producto_id = p.id
  and (p.id in (select id from tmp_prod) or p.id in (select nuevo_id from tmp_split where nuevo_id is not null));

-- Stock = suma de lotes activos; un comercial clonado sin existencias queda inactivo
update public.inv_productos p
set stock_actual = coalesce((
  select sum(l.cantidad_actual) from public.inv_lotes l
  where l.producto_id = p.id and l.activo
), 0)
where p.generico_id is not null;

update public.inv_productos p
set activo = false
where p.id in (select nuevo_id from tmp_split where nuevo_id is not null)
  and coalesce(p.stock_actual, 0) <= 0;

raise notice 'Productos comerciales creados por división de laboratorio: % (lotes movidos: %)',
  (select count(*) from tmp_split where orden > 1),
  (select count(*) from tmp_lote_movido);

end $migracion$;

-- Un mismo laboratorio no repite nombre + presentación dentro de un genérico
create unique index if not exists inv_productos_comercial_uq
  on public.inv_productos (generico_id, laboratorio_id, public.inv_norm(nombre), public.inv_norm(coalesce(presentacion, '')))
  where generico_id is not null;

-- ---------------------------------------------------------------------
-- 6. Vistas para la app (respetan RLS del usuario: security_invoker)
-- ---------------------------------------------------------------------
-- Productos comerciales con su rama completa y stock vendible (vigente).
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
  coalesce(st.lotes_vendibles, 0)                        as lotes_vendibles
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

-- Genéricos con stock total sumando todos sus laboratorios (lo que busca el cajero).
create or replace view public.v_inv_genericos
with (security_invoker = true) as
select
  g.id                                                   as generico_id,
  c.id                                                   as catalogo_id,
  c.nombre                                               as catalogo_nombre,
  g.concentracion,
  g.forma_farmaceutica,
  c.nombre || ' ' || g.concentracion || ' ' || g.forma_farmaceutica as generico_nombre,
  g.requiere_receta,
  g.stock_minimo,
  g.activo,
  count(vc.producto_id)                                  as comerciales,
  count(vc.producto_id) filter (where vc.stock_vendible > 0) as comerciales_con_stock,
  coalesce(sum(vc.stock_vendible), 0)                    as stock_vendible,
  min(vc.precio_venta) filter (where vc.stock_vendible > 0) as precio_desde,
  coalesce(sum(vc.stock_vendible), 0) <= g.stock_minimo  as bajo_minimo
from public.inv_genericos g
join public.inv_catalogos c on c.id = g.catalogo_id
left join public.v_inv_comerciales vc on vc.generico_id = g.id and vc.activo
group by g.id, c.id, c.nombre;

-- ---------------------------------------------------------------------
-- 7. Seguridad (RLS) de las tablas nuevas
--    Sin políticas "permitir todo": solo lectura para usuarios con rol,
--    escritura para super, admin e inventario.
-- ---------------------------------------------------------------------
alter table public.inv_catalogos    enable row level security;
alter table public.inv_genericos    enable row level security;
alter table public.inv_laboratorios enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['inv_catalogos', 'inv_genericos', 'inv_laboratorios'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.tiene_rol(array[''super'',''admin'',''ventas'',''inventario'',''finanzas'',''proveedores'',''clientes'',''user'']))',
      t || '_select', t);

    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.tiene_rol(array[''super'',''admin'',''inventario''])) with check (public.tiene_rol(array[''super'',''admin'',''inventario'']))',
      t || '_write', t);
  end loop;
end $$;

grant select, insert, update, delete on public.inv_catalogos, public.inv_genericos, public.inv_laboratorios to authenticated;
grant select on public.v_inv_comerciales, public.v_inv_genericos to authenticated;

-- ---------------------------------------------------------------------
-- 8. Resumen (aparece en la salida del SQL Editor)
-- ---------------------------------------------------------------------
do $$
declare
  n_cat int; n_gen int; n_lab int; n_sin int;
begin
  select count(*) into n_cat from public.inv_catalogos;
  select count(*) into n_gen from public.inv_genericos;
  select count(*) into n_lab from public.inv_laboratorios;
  select count(*) into n_sin from public.inv_productos where generico_id is null or laboratorio_id is null;
  raise notice 'Catálogos: %, genéricos: %, laboratorios: %', n_cat, n_gen, n_lab;
  if n_sin > 0 then
    raise exception 'Quedaron % productos sin genérico o laboratorio. Revisa antes de continuar.', n_sin;
  end if;
end $$;

commit;