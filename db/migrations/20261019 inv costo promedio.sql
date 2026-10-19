-- =====================================================================
-- FarmaMuni · Costo promedio ponderado y margen de ganancia
--
-- Problema: el precio de venta es uno por marca, pero cada lote tiene su
-- propio costo. Si un lote nuevo llega más barato y se baja el precio con
-- base en ese costo, los lotes viejos (más caros) quedan vendiéndose bajo
-- su costo, y la venta los bloquea con PRECIO_MENOR_COSTO.
--
-- Solución: el precio se calcula sobre el COSTO PROMEDIO PONDERADO de las
-- existencias vendibles de la marca:
--     costo promedio = Σ(cantidad_actual × precio_costo) / Σ(cantidad_actual)
-- solo lotes activos, con existencia y no vencidos (zona America/Guatemala).
--
-- Este script NO modifica registrar_compra ni registrar_venta.
-- Solo agrega: 2 columnas en app_settings, 1 función y 1 vista.
-- Seguro de correr más de una vez.
-- =====================================================================

begin;

-- 1. Margen configurable (porcentaje sobre el costo promedio)
alter table public.app_settings
  add column if not exists margen_ganancia_pct numeric not null default 30,
  add column if not exists margen_minimo_pct  numeric not null default 10;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_settings_margenes_chk') then
    alter table public.app_settings
      add constraint app_settings_margenes_chk
      check (margen_ganancia_pct between 0 and 500
         and margen_minimo_pct  between 0 and 500
         and margen_minimo_pct <= margen_ganancia_pct);
  end if;
end $$;

-- 2. Costo promedio ponderado de UNA marca (producto comercial)
create or replace function public.inv_costo_promedio(p_producto_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select round(
           sum(l.cantidad_actual * coalesce(l.precio_costo, 0))
           / nullif(sum(l.cantidad_actual), 0),
         4)
  from public.inv_lotes l
  where l.producto_id = p_producto_id
    and l.activo
    and l.cantidad_actual > 0
    and (l.fecha_vencimiento is null
         or l.fecha_vencimiento::date >= (now() at time zone 'America/Guatemala')::date);
$$;

-- 3. Vista de costos por marca, para la app (compras, inventario, POS, informes)
create or replace view public.v_inv_costos
with (security_invoker = true) as
select
  p.id                                                         as producto_id,
  coalesce(sum(l.cantidad_actual), 0)                          as existencia_vendible,
  round(sum(l.cantidad_actual * coalesce(l.precio_costo, 0))
        / nullif(sum(l.cantidad_actual), 0), 4)                as costo_promedio,
  min(l.precio_costo)                                          as costo_minimo,
  max(l.precio_costo)                                          as costo_maximo,
  p.precio_base                                                as precio_venta,
  case
    when sum(l.cantidad_actual) > 0
     and sum(l.cantidad_actual * coalesce(l.precio_costo, 0)) > 0
    then round((p.precio_base
                / (sum(l.cantidad_actual * coalesce(l.precio_costo, 0)) / sum(l.cantidad_actual))
                - 1) * 100, 2)
  end                                                          as margen_actual_pct
from public.inv_productos p
left join public.inv_lotes l
  on l.producto_id = p.id
 and l.activo
 and l.cantidad_actual > 0
 and (l.fecha_vencimiento is null
      or l.fecha_vencimiento::date >= (now() at time zone 'America/Guatemala')::date)
group by p.id, p.precio_base;

grant execute on function public.inv_costo_promedio(uuid) to authenticated;
grant select on public.v_inv_costos to authenticated;

commit;

-- Verificación: marcas con existencia, su costo promedio y su margen actual
select p.nombre, c.existencia_vendible, c.costo_minimo, c.costo_maximo,
       c.costo_promedio, c.precio_venta, c.margen_actual_pct
from public.v_inv_costos c
join public.inv_productos p on p.id = c.producto_id
where c.existencia_vendible > 0
order by c.margen_actual_pct nulls last
limit 20;