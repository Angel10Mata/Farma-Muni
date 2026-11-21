-- =====================================================================
-- FarmaMuni · Jerarquía de inventario · FASE 3a: v_kardex sin columnas legacy
-- Mismos nombres y orden de columnas que la vista anterior.
-- Ya aplicada en Supabase; se guarda aquí para que el repo reproduzca la BD.
-- =====================================================================

create or replace view public.v_kardex as
select
  m.id,
  m.created_at,
  m.tipo,
  m.cantidad,
  m.saldo_lote,
  m.saldo_producto,
  m.referencia_tipo,
  m.referencia_id,
  m.motivo,
  m.producto_id,
  p.nombre              as producto_nombre,
  c.nombre::text        as producto_nombre_generico,
  g.concentracion::text as producto_concentracion,
  m.lote_id,
  l.numero_lote         as lote_numero,
  lab.nombre::text      as lote_laboratorio,
  l.codigo_barras       as lote_codigo_barras,
  m.usuario_id,
  pr.nombre             as usuario_nombre
from public.inv_movimientos m
join public.inv_productos p           on p.id = m.producto_id
left join public.inv_genericos g      on g.id = p.generico_id
left join public.inv_catalogos c      on c.id = g.catalogo_id
left join public.inv_laboratorios lab on lab.id = p.laboratorio_id
left join public.inv_lotes l          on l.id = m.lote_id
left join public.profiles pr          on pr.id = m.usuario_id;