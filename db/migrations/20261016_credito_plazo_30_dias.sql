-- Plazo de pago: 30 días calendario por cada venta a crédito (zona Guatemala).

CREATE OR REPLACE FUNCTION public.app_setting_dias_credito()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 30;
$$;

UPDATE public.app_settings
SET dias_credito = 30
WHERE dias_credito IS DISTINCT FROM 30;

UPDATE public.ventas v
SET fecha_credito_vencimiento =
  (timezone('America/Guatemala', v.created_at))::date + public.app_setting_dias_credito()
WHERE lower(trim(v.tipo_venta)) IN ('crédito', 'credito')
  AND v.fecha_credito_vencimiento IS NULL
  AND coalesce(v.estado, 'activa') <> 'anulada';

CREATE OR REPLACE FUNCTION public.trg_ventas_set_fecha_credito_vencimiento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF lower(trim(NEW.tipo_venta)) IN ('crédito', 'credito') THEN
    IF NEW.fecha_credito_vencimiento IS NULL THEN
      NEW.fecha_credito_vencimiento :=
        (timezone('America/Guatemala', coalesce(NEW.created_at, now())))::date
        + public.app_setting_dias_credito();
    END IF;
  ELSE
    NEW.fecha_credito_vencimiento := NULL;
    NEW.credito_autorizado_por := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ventas_set_fecha_credito_vencimiento ON public.ventas;
CREATE TRIGGER ventas_set_fecha_credito_vencimiento
  BEFORE INSERT OR UPDATE OF tipo_venta, created_at, fecha_credito_vencimiento
  ON public.ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ventas_set_fecha_credito_vencimiento();

CREATE OR REPLACE FUNCTION public.fin_cuentas_por_cobrar ()
RETURNS TABLE (
  venta_id uuid,
  cliente_id uuid,
  cliente_nombre text,
  numero_recibo text,
  fecha_venta timestamptz,
  total numeric,
  total_cobrado numeric,
  saldo_pendiente numeric,
  fecha_vencimiento_credito date,
  dias_restantes integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    v.id AS venta_id,
    v.cliente_id,
    coalesce(c.nombre, 'Cliente sin nombre') AS cliente_nombre,
    v.numero_recibo::text AS numero_recibo,
    v.created_at AS fecha_venta,
    coalesce(v.total, 0)::numeric AS total,
    coalesce(pagos.total_cobrado, 0)::numeric AS total_cobrado,
    greatest(
      0::numeric,
      coalesce(v.total, 0)::numeric - coalesce(pagos.total_cobrado, 0)::numeric
    ) AS saldo_pendiente,
    coalesce(
      v.fecha_credito_vencimiento,
      (timezone('America/Guatemala', v.created_at))::date + public.app_setting_dias_credito()
    ) AS fecha_vencimiento_credito,
    (
      coalesce(
        v.fecha_credito_vencimiento,
        (timezone('America/Guatemala', v.created_at))::date + public.app_setting_dias_credito()
      )
      - (timezone('America/Guatemala', now()))::date
    )::integer AS dias_restantes
  FROM public.ventas v
  LEFT JOIN public.ven_clientes c ON c.id = v.cliente_id
  LEFT JOIN LATERAL (
    SELECT sum(coalesce(ft.monto, 0)) AS total_cobrado
    FROM public.fin_transacciones ft
    WHERE ft.venta_id = v.id
      AND ft.categoria IN ('abono_cliente', 'venta')
  ) pagos ON true
  WHERE v.cliente_id IS NOT NULL
    AND lower(trim(v.tipo_venta)) IN ('crédito', 'credito')
    AND coalesce(v.estado, 'activa') <> 'anulada'
    AND greatest(
      0::numeric,
      coalesce(v.total, 0)::numeric - coalesce(pagos.total_cobrado, 0)::numeric
    ) > 0
  ORDER BY v.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.fin_cuentas_por_cobrar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fin_cuentas_por_cobrar() TO authenticated;
