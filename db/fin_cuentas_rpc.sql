-- Ejecutar en Supabase → SQL Editor (una sola vez)
-- Funciones para cuentas por cobrar / por pagar (módulo Finanzas)

create or replace function public.fin_cuentas_por_cobrar ()
returns table (
  venta_id uuid,
  cliente_id uuid,
  cliente_nombre text,
  numero_recibo text,
  fecha_venta timestamptz,
  total numeric,
  total_cobrado numeric,
  saldo_pendiente numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    v.id as venta_id,
    v.cliente_id,
    coalesce(c.nombre, 'Cliente sin nombre') as cliente_nombre,
    v.numero_recibo::text as numero_recibo,
    v.created_at as fecha_venta,
    coalesce(v.total, 0)::numeric as total,
    coalesce(pagos.total_cobrado, 0)::numeric as total_cobrado,
    greatest(
      0::numeric,
      coalesce(v.total, 0)::numeric - coalesce(pagos.total_cobrado, 0)::numeric
    ) as saldo_pendiente
  from public.ventas v
  left join public.ven_clientes c on c.id = v.cliente_id
  left join lateral (
    select sum(coalesce(ft.monto, 0)) as total_cobrado
    from public.fin_transacciones ft
    where ft.venta_id = v.id
      and ft.categoria in ('abono_cliente', 'venta')
  ) pagos on true
  where v.cliente_id is not null
    and lower(trim(v.tipo_venta)) in ('crédito', 'credito')
    and coalesce(v.observaciones, '') not like '%[ANULADA]%'
    and greatest(
      0::numeric,
      coalesce(v.total, 0)::numeric - coalesce(pagos.total_cobrado, 0)::numeric
    ) > 0
  order by v.created_at desc;
$$;

create or replace function public.fin_cuentas_por_pagar ()
returns table (
  compra_id uuid,
  proveedor_id uuid,
  proveedor_nombre text,
  fecha_compra timestamptz,
  total numeric,
  total_pagado numeric,
  saldo_pendiente numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ic.id as compra_id,
    ic.proveedor_id,
    coalesce(p.nombre, 'Proveedor sin nombre') as proveedor_nombre,
    ic.created_at as fecha_compra,
    coalesce(ic.total, 0)::numeric as total,
    coalesce(pagos.total_pagado, 0)::numeric as total_pagado,
    greatest(
      0::numeric,
      coalesce(ic.total, 0)::numeric - coalesce(pagos.total_pagado, 0)::numeric
    ) as saldo_pendiente
  from public.inv_compras ic
  left join public.inv_proveedores p on p.id = ic.proveedor_id
  left join lateral (
    select sum(abs(coalesce(ft.monto, 0))) as total_pagado
    from public.fin_transacciones ft
    where ft.compra_id = ic.id
      and ft.categoria in ('pago_proveedor', 'compra')
  ) pagos on true
  where greatest(
      0::numeric,
      coalesce(ic.total, 0)::numeric - coalesce(pagos.total_pagado, 0)::numeric
    ) > 0
  order by ic.created_at desc;
$$;

grant execute on function public.fin_cuentas_por_cobrar () to authenticated;
grant execute on function public.fin_cuentas_por_pagar () to authenticated;
