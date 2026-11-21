-- FarmaMuni: anulación transaccional de ventas, reversos financieros y cuentas por cobrar/pagar.
-- Idempotente. Ejecutar después de kardex, ventas_mejoras y compras_mejoras.
-- NO se ejecuta desde la app.

-- =============================================================================
-- 1. Columnas nuevas
-- =============================================================================
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS anulada_por uuid,
  ADD COLUMN IF NOT EXISTS anulada_at timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text;

ALTER TABLE public.fin_transacciones
  ADD COLUMN IF NOT EXISTS reversa_de uuid REFERENCES public.fin_transacciones (id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS fin_transacciones_reversa_de_unique
  ON public.fin_transacciones (reversa_de)
  WHERE reversa_de IS NOT NULL;

-- =============================================================================
-- 2. Sincronizar estado desde marcador legacy en observaciones
-- =============================================================================
UPDATE public.ventas
SET estado = 'anulada'
WHERE coalesce(observaciones, '') LIKE '%[ANULADA]%'
  AND coalesce(estado, 'activa') IS DISTINCT FROM 'anulada';

-- =============================================================================
-- 3. public.anular_venta
-- =============================================================================
CREATE OR REPLACE FUNCTION public.anular_venta(
  p_venta_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_venta record;
  v_det record;
  v_lote record;
  v_mov record;
  v_hoy_gt date;
  v_nueva_cant numeric;
  v_activo boolean;
  v_productos uuid[] := ARRAY[]::uuid[];
  v_pid uuid;
  v_lotes_restaurados int := 0;
  v_movimientos_reversados int := 0;
  v_motivo text;
  v_desc text;
BEGIN
  IF NOT public.is_admin_or_super() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_motivo := nullif(trim(p_motivo), '');
  IF v_motivo IS NULL OR length(v_motivo) < 5 THEN
    RAISE EXCEPTION 'MOTIVO_REQUERIDO';
  END IF;

  SELECT v.*
  INTO v_venta
  FROM public.ventas v
  WHERE v.id = p_venta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_ENCONTRADA';
  END IF;

  IF coalesce(v_venta.estado, 'activa') = 'anulada' THEN
    RAISE EXCEPTION 'YA_ANULADA';
  END IF;

  v_hoy_gt := (timezone('America/Guatemala', now()))::date;

  PERFORM set_config('app.mov_tipo', 'anulacion_venta', true);
  PERFORM set_config('app.mov_ref_tipo', 'venta', true);
  PERFORM set_config('app.mov_ref_id', p_venta_id::text, true);
  PERFORM set_config('app.mov_motivo', v_motivo, true);

  FOR v_det IN
    SELECT d.producto_id, d.lote_id, d.cantidad
    FROM public.ven_detalles d
    WHERE d.venta_id = p_venta_id
      AND d.lote_id IS NOT NULL
  LOOP
    SELECT l.*
    INTO v_lote
    FROM public.inv_lotes l
    WHERE l.id = v_det.lote_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_nueva_cant := coalesce(v_lote.cantidad_actual, 0) + coalesce(v_det.cantidad, 0);
    v_activo := v_nueva_cant > 0
      AND (
        v_lote.fecha_vencimiento IS NULL
        OR v_lote.fecha_vencimiento::date >= v_hoy_gt
      );

    UPDATE public.inv_lotes
    SET cantidad_actual = v_nueva_cant,
        activo = v_activo
    WHERE id = v_det.lote_id;

    v_lotes_restaurados := v_lotes_restaurados + 1;

    IF NOT v_det.producto_id = ANY (v_productos) THEN
      v_productos := array_append(v_productos, v_det.producto_id);
    END IF;
  END LOOP;

  FOREACH v_pid IN ARRAY v_productos
  LOOP
    PERFORM public.inv_sync_producto_stock_desde_lotes(v_pid);
    UPDATE public.inv_productos
    SET activo = true
    WHERE id = v_pid
      AND stock_actual > 0;
  END LOOP;

  FOR v_mov IN
    SELECT ft.*
    FROM public.fin_transacciones ft
    WHERE ft.venta_id = p_venta_id
      AND ft.reversa_de IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.fin_transacciones r
        WHERE r.reversa_de = ft.id
      )
  LOOP
    v_desc := 'Anulación: ' || coalesce(v_mov.descripcion, 'movimiento');

    INSERT INTO public.fin_transacciones (
      tipo_movimiento,
      categoria,
      monto,
      descripcion,
      usuario_id,
      venta_id,
      compra_id,
      gasto_fijo_id,
      reversa_de
    )
    VALUES (
      v_mov.tipo_movimiento,
      v_mov.categoria,
      -coalesce(v_mov.monto, 0),
      v_desc,
      auth.uid(),
      v_mov.venta_id,
      v_mov.compra_id,
      v_mov.gasto_fijo_id,
      v_mov.id
    );

    v_movimientos_reversados := v_movimientos_reversados + 1;
  END LOOP;

  UPDATE public.ventas
  SET estado = 'anulada',
      anulada_por = auth.uid(),
      anulada_at = now(),
      motivo_anulacion = v_motivo
  WHERE id = p_venta_id;

  RETURN jsonb_build_object(
    'venta_id', p_venta_id,
    'lotes_restaurados', v_lotes_restaurados,
    'movimientos_reversados', v_movimientos_reversados
  );
END;
$$;

-- =============================================================================
-- 4. public.reversar_movimiento
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reversar_movimiento(
  p_mov_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_mov record;
  v_motivo text;
  v_desc text;
BEGIN
  IF NOT public.tiene_rol(ARRAY['super', 'admin', 'finanzas']) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_motivo := nullif(trim(p_motivo), '');
  IF v_motivo IS NULL OR length(v_motivo) < 5 THEN
    RAISE EXCEPTION 'MOTIVO_REQUERIDO';
  END IF;

  SELECT ft.*
  INTO v_mov
  FROM public.fin_transacciones ft
  WHERE ft.id = p_mov_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_ENCONTRADA';
  END IF;

  IF v_mov.reversa_de IS NOT NULL THEN
    RAISE EXCEPTION 'ES_REVERSO';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.fin_transacciones r
    WHERE r.reversa_de = p_mov_id
  ) THEN
    RAISE EXCEPTION 'YA_REVERSADO';
  END IF;

  IF v_mov.categoria = 'venta' THEN
    RAISE EXCEPTION 'USAR_ANULAR_VENTA';
  END IF;

  IF v_mov.venta_id IS NOT NULL AND v_mov.categoria IS DISTINCT FROM 'abono_cliente' THEN
    RAISE EXCEPTION 'USAR_ANULAR_VENTA';
  END IF;

  v_desc := 'Reverso: ' || coalesce(v_mov.descripcion, 'movimiento');

  INSERT INTO public.fin_transacciones (
    tipo_movimiento,
    categoria,
    monto,
    descripcion,
    usuario_id,
    venta_id,
    compra_id,
    gasto_fijo_id,
    reversa_de
  )
  VALUES (
    v_mov.tipo_movimiento,
    v_mov.categoria,
    -coalesce(v_mov.monto, 0),
    v_desc,
    auth.uid(),
    v_mov.venta_id,
    v_mov.compra_id,
    v_mov.gasto_fijo_id,
    v_mov.id
  );

  RETURN jsonb_build_object('movimiento_id', p_mov_id, 'reverso', true);
END;
$$;

REVOKE ALL ON FUNCTION public.anular_venta(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anular_venta(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.anular_venta(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.reversar_movimiento(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reversar_movimiento(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reversar_movimiento(uuid, text) TO authenticated;

-- =============================================================================
-- 5. fin_cuentas_por_pagar (suma con signo; pagos positivos, reversos negativos)
-- =============================================================================
DROP FUNCTION IF EXISTS public.fin_cuentas_por_pagar();

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
    SELECT sum(coalesce(ft.monto, 0)) AS total_pagado
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

-- =============================================================================
-- 6. fin_cuentas_por_cobrar y resúmenes (estado anulada, no texto en observaciones)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fin_cuentas_por_cobrar ()
RETURNS TABLE (
  venta_id uuid,
  cliente_id uuid,
  cliente_nombre text,
  numero_recibo text,
  fecha_venta timestamptz,
  total numeric,
  total_cobrado numeric,
  saldo_pendiente numeric
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
    ) AS saldo_pendiente
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

CREATE OR REPLACE FUNCTION public.cliente_credito_vencido_resumen(p_cliente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_hoy date;
  v_total numeric := 0;
  v_desde date;
  v_row record;
  v_saldo numeric;
  v_fecha date;
BEGIN
  IF p_cliente_id IS NULL THEN
    RETURN jsonb_build_object('vencido', false, 'total', 0, 'desde', null);
  END IF;

  v_hoy := (timezone('America/Guatemala', now()))::date;

  FOR v_row IN
    SELECT v.id
    FROM public.ventas v
    WHERE v.cliente_id = p_cliente_id
      AND lower(trim(v.tipo_venta)) IN ('crédito', 'credito')
      AND coalesce(v.estado, 'activa') <> 'anulada'
  LOOP
    v_saldo := public.venta_saldo_pendiente(v_row.id);
    IF v_saldo > 0.009 THEN
      v_fecha := public.venta_fecha_vence_credito(v_row.id);
      IF v_fecha < v_hoy THEN
        v_total := v_total + v_saldo;
        IF v_desde IS NULL OR v_fecha < v_desde THEN
          v_desde := v_fecha;
        END IF;
      END IF;
    END IF;
  END LOOP;

  IF v_total > 0.009 THEN
    RETURN jsonb_build_object('vencido', true, 'total', round(v_total, 2), 'desde', v_desde);
  END IF;

  RETURN jsonb_build_object('vencido', false, 'total', 0, 'desde', null);
END;
$$;

-- =============================================================================
-- 7. Verificación manual (comentado; ejecutar tras migrar)
-- =============================================================================
/*
-- Ventas anuladas con movimiento financiero sin reverso neto (debería ser 0 filas):
SELECT v.id, sum(ft.monto) AS saldo_fin
FROM public.ventas v
JOIN public.fin_transacciones ft ON ft.venta_id = v.id
WHERE v.estado = 'anulada'
GROUP BY v.id
HAVING abs(sum(ft.monto)) > 0.01;

-- reversa_de duplicado (debería ser 0 filas):
SELECT reversa_de, count(*)
FROM public.fin_transacciones
WHERE reversa_de IS NOT NULL
GROUP BY reversa_de
HAVING count(*) > 1;

-- Créditos de ventas anuladas con saldo distinto de 0 (debería ser 0 filas):
SELECT v.id, public.venta_saldo_pendiente(v.id) AS saldo
FROM public.ventas v
WHERE v.estado = 'anulada'
  AND lower(trim(v.tipo_venta)) IN ('crédito', 'credito')
  AND public.venta_saldo_pendiente(v.id) > 0.01;
*/
