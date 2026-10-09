-- FarmaMuni: factura de compra, vencimiento de pago, cuentas por pagar
-- Ejecutar después de las migraciones previas de compras/RLS.

-- =============================================================================
-- 1. Columnas en inv_compras
-- =============================================================================
ALTER TABLE public.inv_compras
  ADD COLUMN IF NOT EXISTS numero_factura text,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_pago date;

CREATE UNIQUE INDEX IF NOT EXISTS inv_compras_proveedor_numero_factura_unique
  ON public.inv_compras (proveedor_id, lower(btrim(numero_factura)))
  WHERE numero_factura IS NOT NULL AND btrim(numero_factura) <> '';

-- =============================================================================
-- 2. fin_cuentas_por_pagar (incluye factura y vencimiento)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fin_cuentas_por_pagar ()
RETURNS TABLE (
  compra_id uuid,
  proveedor_id uuid,
  proveedor_nombre text,
  numero_factura text,
  fecha_compra timestamptz,
  fecha_vencimiento_pago date,
  total numeric,
  total_pagado numeric,
  saldo_pendiente numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ic.id AS compra_id,
    ic.proveedor_id,
    coalesce(p.nombre, 'Proveedor sin nombre') AS proveedor_nombre,
    nullif(btrim(ic.numero_factura), '') AS numero_factura,
    ic.created_at AS fecha_compra,
    ic.fecha_vencimiento_pago,
    coalesce(ic.total, 0)::numeric AS total,
    coalesce(pagos.total_pagado, 0)::numeric AS total_pagado,
    greatest(
      0::numeric,
      coalesce(ic.total, 0)::numeric - coalesce(pagos.total_pagado, 0)::numeric
    ) AS saldo_pendiente
  FROM public.inv_compras ic
  LEFT JOIN public.inv_proveedores p ON p.id = ic.proveedor_id
  LEFT JOIN LATERAL (
    SELECT sum(abs(coalesce(ft.monto, 0))) AS total_pagado
    FROM public.fin_transacciones ft
    WHERE ft.compra_id = ic.id
      AND ft.categoria IN ('pago_proveedor', 'compra')
  ) pagos ON true
  WHERE greatest(
      0::numeric,
      coalesce(ic.total, 0)::numeric - coalesce(pagos.total_pagado, 0)::numeric
    ) > 0
  ORDER BY ic.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.fin_cuentas_por_pagar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fin_cuentas_por_pagar() TO authenticated;
