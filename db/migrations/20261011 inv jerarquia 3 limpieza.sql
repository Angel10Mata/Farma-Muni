-- =====================================================================
-- FarmaMuni · Jerarquía de inventario · FASE 3: limpieza
--
-- NO EJECUTAR hasta que la app (fase 2) ya:
--   - cree productos comerciales con generico_id y laboratorio_id,
--   - lea el precio de venta del producto comercial (no del lote),
--   - lea laboratorio, concentración, forma y receta desde la jerarquía.
--
-- Esta fase elimina columnas duplicadas. Después de correrla, el código
-- viejo que las use deja de funcionar.
-- =====================================================================

begin;

-- Seguro: no seguir si hay productos fuera de la jerarquía
do $$
declare
  n int;
begin
  select count(*) into n from public.inv_productos where generico_id is null or laboratorio_id is null;
  if n > 0 then
    raise exception 'Hay % productos sin genérico o laboratorio. Asígnalos antes de la limpieza.', n;
  end if;
end $$;

alter table public.inv_productos
  alter column generico_id    set not null,
  alter column laboratorio_id set not null;

-- Datos que ahora viven en el genérico
alter table public.inv_productos
  drop column if exists nombre_generico,
  drop column if exists concentracion,
  drop column if exists forma_farmaceutica,
  drop column if exists requiere_receta,
  drop column if exists unidad_venta,
  drop column if exists stock_minimo,
  drop column if exists proveedor_id;     -- el proveedor es de la compra/lote, no del producto

-- NOTA: inv_productos.precio_base NO se renombra. La app y las funciones
-- registrar_compra / registrar_venta lo leen por ese nombre; las vistas ya lo
-- exponen como precio_venta. Renombrarlo rompería ambas funciones (plpgsql no
-- avisa) sin ningún beneficio funcional.

-- Datos que ahora viven en el producto comercial
alter table public.inv_lotes
  drop column if exists laboratorio,
  drop column if exists precio_venta;

commit;