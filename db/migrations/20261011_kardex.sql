-- FarmaMuni: kardex de inventario (inv_movimientos).
-- Ejecutar en Supabase → SQL Editor (idempotente). NO se ejecuta desde la app.
--
-- Prerrequisitos: inv_productos, inv_lotes, ventas, profiles, tiene_rol / is_admin_or_super.
-- Orden sugerido: después de 20261009_registrar_venta_validada.sql y 20261009_seguridad_rls.sql.
--
-- NOTA: Cuando se cree public.anular_venta debe hacer, antes de devolver stock a cada lote:
--   PERFORM set_config('app.mov_tipo', 'anulacion_venta', true);
--   PERFORM set_config('app.mov_ref_tipo', 'venta', true);
--   PERFORM set_config('app.mov_ref_id', <venta_id>::text, true);

-- =============================================================================
-- 1. Tabla inv_movimientos
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.inv_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  producto_id uuid NOT NULL REFERENCES public.inv_productos (id) ON DELETE RESTRICT,
  lote_id uuid REFERENCES public.inv_lotes (id) ON DELETE SET NULL,
  tipo text NOT NULL,
  cantidad numeric NOT NULL,
  saldo_lote numeric,
  saldo_producto numeric,
  referencia_tipo text,
  referencia_id uuid,
  motivo text,
  usuario_id uuid,
  CONSTRAINT inv_movimientos_tipo_check CHECK (
    tipo IN (
      'entrada_compra',
      'entrada_manual',
      'salida_venta',
      'anulacion_venta',
      'ajuste_conteo',
      'baja_vencimiento',
      'devolucion_proveedor',
      'correccion'
    )
  )
);

COMMENT ON TABLE public.inv_movimientos IS 'Kardex inmutable de movimientos de inventario por producto/lote.';
COMMENT ON COLUMN public.inv_movimientos.cantidad IS 'Positivo entra, negativo sale (delta aplicado al lote).';

CREATE INDEX IF NOT EXISTS inv_movimientos_producto_created_idx
  ON public.inv_movimientos (producto_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inv_movimientos_lote_created_idx
  ON public.inv_movimientos (lote_id, created_at DESC)
  WHERE lote_id IS NOT NULL;

ALTER TABLE public.inv_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inv_movimientos_select ON public.inv_movimientos;
CREATE POLICY inv_movimientos_select
  ON public.inv_movimientos
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN to_regprocedure('public.tiene_rol(text[])') IS NOT NULL THEN
        public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'finanzas'])
      ELSE
        public.is_admin_or_super()
    END
  );

REVOKE ALL ON TABLE public.inv_movimientos FROM PUBLIC;
REVOKE ALL ON TABLE public.inv_movimientos FROM anon;
GRANT SELECT ON TABLE public.inv_movimientos TO authenticated;

-- Inmutabilidad: sin UPDATE ni DELETE (salvo service role / bypass RLS).
CREATE OR REPLACE FUNCTION public.inv_movimientos_impedir_mutacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos de kardex son inmutables.';
END;
$$;

DROP TRIGGER IF EXISTS inv_movimientos_no_update ON public.inv_movimientos;
CREATE TRIGGER inv_movimientos_no_update
  BEFORE UPDATE ON public.inv_movimientos
  FOR EACH ROW
  EXECUTE FUNCTION public.inv_movimientos_impedir_mutacion();

DROP TRIGGER IF EXISTS inv_movimientos_no_delete ON public.inv_movimientos;
CREATE TRIGGER inv_movimientos_no_delete
  BEFORE DELETE ON public.inv_movimientos
  FOR EACH ROW
  EXECUTE FUNCTION public.inv_movimientos_impedir_mutacion();

-- =============================================================================
-- Helpers kardex (SECURITY DEFINER: insertar movimientos con RLS activo)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.inv_kardex_saldo_producto(p_producto_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum(l.cantidad_actual), 0)
  FROM public.inv_lotes l
  WHERE l.producto_id = p_producto_id
    AND coalesce(l.activo, false) = true;
$$;

CREATE OR REPLACE FUNCTION public.inv_kardex_insertar_movimiento(
  p_producto_id uuid,
  p_lote_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_saldo_lote numeric,
  p_saldo_producto numeric,
  p_referencia_tipo text,
  p_referencia_id uuid,
  p_motivo text,
  p_usuario_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inv_movimientos (
    producto_id,
    lote_id,
    tipo,
    cantidad,
    saldo_lote,
    saldo_producto,
    referencia_tipo,
    referencia_id,
    motivo,
    usuario_id
  )
  VALUES (
    p_producto_id,
    p_lote_id,
    p_tipo,
    p_cantidad,
    p_saldo_lote,
    p_saldo_producto,
    p_referencia_tipo,
    p_referencia_id,
    nullif(trim(p_motivo), ''),
    p_usuario_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.inv_sync_producto_stock_desde_lotes(p_producto_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock numeric;
BEGIN
  SELECT coalesce(sum(l.cantidad_actual), 0)
  INTO v_stock
  FROM public.inv_lotes l
  WHERE l.producto_id = p_producto_id
    AND coalesce(l.activo, false) = true;

  UPDATE public.inv_productos
  SET stock_actual = greatest(v_stock, 0),
      activo = CASE
        WHEN v_stock > 0 THEN true
        WHEN v_stock <= 0 THEN false
        ELSE activo
      END
  WHERE id = p_producto_id;

  RETURN v_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.inv_kardex_exige_rol_operacion()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida o expirada.';
  END IF;

  IF to_regprocedure('public.tiene_rol(text[])') IS NOT NULL THEN
    IF NOT public.tiene_rol(ARRAY['super', 'admin', 'inventario']) THEN
      RAISE EXCEPTION 'No autorizado para operaciones de inventario.';
    END IF;
  ELSIF NOT public.is_admin_or_super() THEN
    RAISE EXCEPTION 'No autorizado para operaciones de inventario.';
  END IF;
END;
$$;

-- =============================================================================
-- 2. Trigger en inv_lotes → inv_movimientos
-- =============================================================================
CREATE OR REPLACE FUNCTION public.inv_lotes_kardex_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric;
  v_tipo text;
  v_ref_tipo text;
  v_ref_id uuid;
  v_motivo text;
  v_saldo_lote numeric;
  v_saldo_producto numeric;
  v_usuario uuid;
BEGIN
  v_usuario := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.cantidad_actual, 0) <= 0 THEN
      RETURN NEW;
    END IF;

    v_tipo := nullif(trim(current_setting('app.mov_tipo', true)), '');
    IF v_tipo IS NULL THEN
      v_tipo := 'entrada_manual';
    END IF;

    v_ref_tipo := nullif(trim(current_setting('app.mov_ref_tipo', true)), '');
    v_motivo := nullif(trim(current_setting('app.mov_motivo', true)), '');
    BEGIN
      v_ref_id := nullif(trim(current_setting('app.mov_ref_id', true)), '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_ref_id := NULL;
    END;

    v_saldo_lote := NEW.cantidad_actual;
    v_saldo_producto := public.inv_kardex_saldo_producto(NEW.producto_id);

    PERFORM public.inv_kardex_insertar_movimiento(
      NEW.producto_id,
      NEW.id,
      v_tipo,
      NEW.cantidad_actual,
      v_saldo_lote,
      v_saldo_producto,
      v_ref_tipo,
      v_ref_id,
      v_motivo,
      v_usuario
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.cantidad_actual IS NOT DISTINCT FROM NEW.cantidad_actual THEN
      RETURN NEW;
    END IF;

    v_delta := NEW.cantidad_actual - coalesce(OLD.cantidad_actual, 0);

    v_tipo := nullif(trim(current_setting('app.mov_tipo', true)), '');
    IF v_tipo IS NULL THEN
      v_tipo := 'correccion';
    END IF;

    v_ref_tipo := nullif(trim(current_setting('app.mov_ref_tipo', true)), '');
    v_motivo := nullif(trim(current_setting('app.mov_motivo', true)), '');
    BEGIN
      v_ref_id := nullif(trim(current_setting('app.mov_ref_id', true)), '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_ref_id := NULL;
    END;

    v_saldo_lote := NEW.cantidad_actual;
    v_saldo_producto := public.inv_kardex_saldo_producto(NEW.producto_id);

    PERFORM public.inv_kardex_insertar_movimiento(
      NEW.producto_id,
      NEW.id,
      v_tipo,
      v_delta,
      v_saldo_lote,
      v_saldo_producto,
      v_ref_tipo,
      v_ref_id,
      v_motivo,
      v_usuario
    );

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inv_lotes_kardex_trg ON public.inv_lotes;
CREATE TRIGGER inv_lotes_kardex_trg
  AFTER INSERT OR UPDATE OF cantidad_actual ON public.inv_lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.inv_lotes_kardex_trg();

-- =============================================================================
-- 3. Carga inicial: saldo existente sin movimientos previos
-- =============================================================================
INSERT INTO public.inv_movimientos (
  producto_id,
  lote_id,
  tipo,
  cantidad,
  saldo_lote,
  saldo_producto,
  referencia_tipo,
  referencia_id,
  motivo,
  usuario_id
)
SELECT
  l.producto_id,
  l.id,
  'entrada_manual',
  l.cantidad_actual,
  l.cantidad_actual,
  public.inv_kardex_saldo_producto(l.producto_id),
  NULL,
  NULL,
  'Saldo inicial',
  NULL
FROM public.inv_lotes l
WHERE coalesce(l.cantidad_actual, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.inv_movimientos m
    WHERE m.lote_id = l.id
  );

-- =============================================================================
-- 5. Operaciones de inventario (SECURITY INVOKER + set_config → trigger kardex)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ajustar_lote_por_conteo(
  p_lote_id uuid,
  p_cantidad_contada numeric,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_lote record;
  v_anterior numeric;
  v_hoy_gt date;
  v_activo boolean;
BEGIN
  PERFORM public.inv_kardex_exige_rol_operacion();

  IF p_lote_id IS NULL THEN
    RAISE EXCEPTION 'Lote requerido.';
  END IF;

  IF p_cantidad_contada IS NULL OR p_cantidad_contada < 0 THEN
    RAISE EXCEPTION 'La cantidad contada no puede ser negativa.';
  END IF;

  IF nullif(trim(p_motivo), '') IS NULL THEN
    RAISE EXCEPTION 'El motivo del ajuste es obligatorio.';
  END IF;

  v_hoy_gt := (timezone('America/Guatemala', now()))::date;

  SELECT l.id, l.producto_id, l.cantidad_actual, l.fecha_vencimiento
  INTO v_lote
  FROM public.inv_lotes l
  WHERE l.id = p_lote_id
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no encontrado.';
  END IF;

  v_anterior := coalesce(v_lote.cantidad_actual, 0);

  v_activo := p_cantidad_contada > 0
    AND (
      v_lote.fecha_vencimiento IS NULL
      OR v_lote.fecha_vencimiento::date >= v_hoy_gt
    );

  PERFORM set_config('app.mov_tipo', 'ajuste_conteo', true);
  PERFORM set_config('app.mov_motivo', trim(p_motivo), true);
  PERFORM set_config('app.mov_ref_tipo', '', true);
  PERFORM set_config('app.mov_ref_id', '', true);

  UPDATE public.inv_lotes
  SET cantidad_actual = p_cantidad_contada,
      activo = v_activo
  WHERE id = p_lote_id;

  PERFORM public.inv_sync_producto_stock_desde_lotes(v_lote.producto_id);

  RETURN jsonb_build_object(
    'lote_id', p_lote_id,
    'cantidad_anterior', v_anterior,
    'cantidad_nueva', p_cantidad_contada,
    'diferencia', p_cantidad_contada - v_anterior
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dar_baja_lote_vencido(
  p_lote_id uuid,
  p_motivo text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_lote record;
  v_hoy_gt date;
  v_baja numeric;
  v_motivo text;
BEGIN
  PERFORM public.inv_kardex_exige_rol_operacion();

  IF p_lote_id IS NULL THEN
    RAISE EXCEPTION 'Lote requerido.';
  END IF;

  v_motivo := nullif(trim(p_motivo), '');
  v_hoy_gt := (timezone('America/Guatemala', now()))::date;

  SELECT l.id, l.producto_id, l.cantidad_actual, l.fecha_vencimiento
  INTO v_lote
  FROM public.inv_lotes l
  WHERE l.id = p_lote_id
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no encontrado.';
  END IF;

  IF v_lote.fecha_vencimiento IS NOT NULL
    AND v_lote.fecha_vencimiento::date >= v_hoy_gt
    AND v_motivo IS NULL THEN
    RAISE EXCEPTION 'Solo se puede dar de baja un lote vencido o indicando motivo (daño, merma, etc.).';
  END IF;

  v_baja := coalesce(v_lote.cantidad_actual, 0);

  IF v_baja <= 0 THEN
    RETURN 0;
  END IF;

  PERFORM set_config('app.mov_tipo', 'baja_vencimiento', true);
  PERFORM set_config('app.mov_motivo', coalesce(v_motivo, 'Baja por vencimiento'), true);
  PERFORM set_config('app.mov_ref_tipo', '', true);
  PERFORM set_config('app.mov_ref_id', '', true);

  UPDATE public.inv_lotes
  SET cantidad_actual = 0,
      activo = false
  WHERE id = p_lote_id;

  PERFORM public.inv_sync_producto_stock_desde_lotes(v_lote.producto_id);

  RETURN v_baja;
END;
$$;

CREATE OR REPLACE FUNCTION public.devolver_lote_a_proveedor(
  p_lote_id uuid,
  p_cantidad numeric,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_lote record;
  v_hoy_gt date;
  v_nueva numeric;
  v_activo boolean;
  v_motivo text;
BEGIN
  PERFORM public.inv_kardex_exige_rol_operacion();

  -- Trabajo futuro: registrar nota de crédito en finanzas al devolver al proveedor.

  IF p_lote_id IS NULL THEN
    RAISE EXCEPTION 'Lote requerido.';
  END IF;

  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad a devolver debe ser mayor que cero.';
  END IF;

  v_motivo := nullif(trim(p_motivo), '');
  IF v_motivo IS NULL THEN
    RAISE EXCEPTION 'El motivo de la devolución es obligatorio.';
  END IF;

  v_hoy_gt := (timezone('America/Guatemala', now()))::date;

  SELECT l.id, l.producto_id, l.cantidad_actual, l.fecha_vencimiento, l.proveedor_id
  INTO v_lote
  FROM public.inv_lotes l
  WHERE l.id = p_lote_id
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no encontrado.';
  END IF;

  IF coalesce(v_lote.cantidad_actual, 0) < p_cantidad THEN
    RAISE EXCEPTION 'Cantidad a devolver mayor que el stock del lote.';
  END IF;

  v_nueva := v_lote.cantidad_actual - p_cantidad;

  v_activo := v_nueva > 0
    AND (
      v_lote.fecha_vencimiento IS NULL
      OR v_lote.fecha_vencimiento::date >= v_hoy_gt
    );

  PERFORM set_config('app.mov_tipo', 'devolucion_proveedor', true);
  PERFORM set_config('app.mov_motivo', v_motivo, true);
  PERFORM set_config('app.mov_ref_tipo', 'proveedor', true);
  IF v_lote.proveedor_id IS NOT NULL THEN
    PERFORM set_config('app.mov_ref_id', v_lote.proveedor_id::text, true);
  ELSE
    PERFORM set_config('app.mov_ref_id', '', true);
  END IF;

  UPDATE public.inv_lotes
  SET cantidad_actual = v_nueva,
      activo = v_activo
  WHERE id = p_lote_id;

  PERFORM public.inv_sync_producto_stock_desde_lotes(v_lote.producto_id);

  RETURN jsonb_build_object(
    'lote_id', p_lote_id,
    'cantidad_devuelta', p_cantidad,
    'cantidad_restante', v_nueva,
    'proveedor_id', v_lote.proveedor_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ajustar_lote_por_conteo(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ajustar_lote_por_conteo(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ajustar_lote_por_conteo(uuid, numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.dar_baja_lote_vencido(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dar_baja_lote_vencido(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.dar_baja_lote_vencido(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.devolver_lote_a_proveedor(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.devolver_lote_a_proveedor(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.devolver_lote_a_proveedor(uuid, numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.inv_kardex_insertar_movimiento(
  uuid, uuid, text, numeric, numeric, numeric, text, uuid, text, uuid
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.inv_kardex_insertar_movimiento(
  uuid, uuid, text, numeric, numeric, numeric, text, uuid, text, uuid
) FROM anon;
REVOKE ALL ON FUNCTION public.inv_kardex_insertar_movimiento(
  uuid, uuid, text, numeric, numeric, numeric, text, uuid, text, uuid
) FROM authenticated;

-- =============================================================================
-- 4. registrar_venta (misma firma; kardex via set_config antes de descontar lotes)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.registrar_venta(p_venta jsonb, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_usuario_id uuid;
  v_cliente_id uuid;
  v_tipo_venta text;
  v_total numeric;
  v_observaciones text;
  v_descuento numeric;
  v_otros_cargos numeric;
  v_venta_id uuid;
  v_numero_recibo bigint;
  v_hoy_gt date;
  v_item jsonb;
  v_linea jsonb;
  v_producto_id uuid;
  v_lote_id uuid;
  v_cantidad numeric;
  v_precio_cliente numeric;
  v_precio_venta_ref numeric;
  v_precio_costo numeric;
  v_precio_efectivo numeric;
  v_subtotal numeric;
  v_total_lineas numeric := 0;
  v_lote record;
  v_nueva_cantidad numeric;
  v_productos_afectados uuid[] := '{}';
  v_stock numeric;
  v_pid uuid;
  v_desc_fin text;
  v_nombre_producto text;
  v_lineas jsonb := '[]'::jsonb;
  v_hay_rebaja boolean := false;
  v_es_admin boolean;
  v_solicitud_id uuid;
  v_solicitud record;
  v_payload jsonb;
  v_eps constant numeric := 0.001;
BEGIN
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida o expirada.';
  END IF;

  v_es_admin := public.is_admin_or_super();

  IF p_venta IS NULL OR p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Datos de venta inválidos.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La venta debe contener al menos un producto.';
  END IF;

  IF coalesce(p_venta->>'usuario_id', '') <> v_usuario_id::text THEN
    RAISE EXCEPTION 'El usuario de la venta no coincide con la sesión.';
  END IF;

  v_cliente_id := nullif(p_venta->>'cliente_id', '')::uuid;
  v_tipo_venta := coalesce(p_venta->>'tipo_venta', '');
  v_observaciones := nullif(trim(p_venta->>'observaciones'), '');
  v_descuento := coalesce((p_venta->>'descuento')::numeric, 0);
  v_otros_cargos := coalesce((p_venta->>'otros_cargos')::numeric, 0);
  v_solicitud_id := nullif(p_venta->>'solicitud_rebaja_id', '')::uuid;

  IF v_descuento < 0 OR v_otros_cargos < 0 THEN
    RAISE EXCEPTION 'Descuentos u otros cargos no pueden ser negativos.';
  END IF;

  v_hoy_gt := (timezone('America/Guatemala', now()))::date;

  -- Validar líneas y bloquear lotes (precios desde BD)
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_lote_id := nullif(v_item->>'lote_id', '')::uuid;
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_precio_cliente := coalesce((v_item->>'precio_aplicado')::numeric, 0);

    IF v_producto_id IS NULL THEN
      RAISE EXCEPTION 'Cada línea debe incluir producto_id.';
    END IF;

    IF v_lote_id IS NULL THEN
      RAISE EXCEPTION 'Cada línea de venta debe tener un lote asignado.';
    END IF;

    IF v_cantidad IS NULL OR v_cantidad <= 0 OR v_cantidad <> trunc(v_cantidad) THEN
      RAISE EXCEPTION 'Cantidad inválida en un detalle de venta (debe ser entera mayor que cero).';
    END IF;

    SELECT
      l.id,
      l.producto_id,
      l.cantidad_actual,
      l.activo,
      l.fecha_vencimiento,
      l.precio_costo,
      l.precio_venta,
      p.nombre AS producto_nombre,
      p.precio_base
    INTO v_lote
    FROM public.inv_lotes l
    LEFT JOIN public.inv_productos p ON p.id = l.producto_id
    WHERE l.id = v_lote_id
    FOR UPDATE OF l;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lote no válido o inactivo para la venta.';
    END IF;

    IF NOT coalesce(v_lote.activo, false) THEN
      RAISE EXCEPTION 'Lote no válido o inactivo para la venta.';
    END IF;

    IF v_lote.producto_id IS DISTINCT FROM v_producto_id THEN
      RAISE EXCEPTION 'El lote no corresponde al producto de la venta.';
    END IF;

    IF v_lote.fecha_vencimiento IS NOT NULL
      AND v_lote.fecha_vencimiento::date < v_hoy_gt THEN
      RAISE EXCEPTION 'No se puede vender un lote vencido.';
    END IF;

    v_nombre_producto := coalesce(v_lote.producto_nombre, 'Producto');

    IF coalesce(v_lote.cantidad_actual, 0) < v_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente en lote para % (Disponibles: %, Solicitados: %).',
        v_nombre_producto,
        coalesce(v_lote.cantidad_actual, 0),
        v_cantidad;
    END IF;

    v_precio_venta_ref := coalesce(
      CASE
        WHEN v_lote.precio_venta IS NOT NULL THEN v_lote.precio_venta::numeric
        ELSE NULL
      END,
      v_lote.precio_base::numeric,
      0
    );
    v_precio_costo := greatest(coalesce(v_lote.precio_costo::numeric, 0), 0);

    IF v_precio_cliente < v_precio_venta_ref - v_eps THEN
      v_hay_rebaja := true;
      v_precio_efectivo := v_precio_cliente;
    ELSE
      v_precio_efectivo := v_precio_cliente;
    END IF;

    IF v_precio_efectivo < v_precio_costo - v_eps AND NOT v_es_admin THEN
      RAISE EXCEPTION 'PRECIO_MENOR_COSTO';
    END IF;

    v_subtotal := round(v_cantidad * v_precio_efectivo, 2);
    v_total_lineas := v_total_lineas + v_subtotal;

    v_lineas := v_lineas || jsonb_build_array(
      jsonb_build_object(
        'producto_id', v_producto_id,
        'lote_id', v_lote_id,
        'cantidad', v_cantidad,
        'precio_aplicado', v_precio_efectivo,
        'subtotal', v_subtotal
      )
    );
  END LOOP;

  v_total := round(v_total_lineas - v_descuento + v_otros_cargos, 2);

  IF v_total < 0 THEN
    RAISE EXCEPTION 'El total de la venta no puede ser negativo.';
  END IF;

  IF v_hay_rebaja AND v_solicitud_id IS NULL THEN
    RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
  END IF;

  IF v_hay_rebaja THEN
    SELECT s.id, s.solicitante_id, s.estado, s.venta_id, s.payload
    INTO v_solicitud
    FROM public.ven_solicitudes_rebaja s
    WHERE s.id = v_solicitud_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    IF v_solicitud.solicitante_id IS DISTINCT FROM v_usuario_id THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    IF v_solicitud.estado IS DISTINCT FROM 'aprobada' THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    IF v_solicitud.venta_id IS NOT NULL THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    v_payload := v_solicitud.payload;

    IF coalesce(v_payload->>'cliente_id', '') IS DISTINCT FROM coalesce(v_cliente_id::text, '') THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    IF coalesce(v_payload->>'tipo_venta', '') IS DISTINCT FROM v_tipo_venta THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    IF coalesce(nullif(trim(v_payload->>'observaciones'), ''), '')
      IS DISTINCT FROM coalesce(v_observaciones, '') THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    IF jsonb_array_length(coalesce(v_payload->'items', '[]'::jsonb))
      IS DISTINCT FROM jsonb_array_length(p_items) THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    IF abs(coalesce((v_payload->>'total')::numeric, 0) - v_total) > 0.01 THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(coalesce(v_payload->'items', '[]'::jsonb)) AS elem(value)
        WHERE (elem.value->>'producto_id') = (v_item->>'producto_id')
          AND coalesce(elem.value->>'lote_id', '') = coalesce(v_item->>'lote_id', '')
          AND (elem.value->>'cantidad')::numeric = (v_item->>'cantidad')::numeric
          AND abs(
            coalesce((elem.value->>'precio_aplicado')::numeric, 0)
            - coalesce((v_item->>'precio_aplicado')::numeric, 0)
          ) < 0.01
      ) THEN
        RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.ventas (
    cliente_id,
    usuario_id,
    tipo_venta,
    total,
    observaciones,
    estado
  )
  VALUES (
    v_cliente_id,
    v_usuario_id,
    v_tipo_venta,
    v_total,
    v_observaciones,
    'activa'
  )
  RETURNING id, numero_recibo INTO v_venta_id, v_numero_recibo;

  FOR v_linea IN SELECT value FROM jsonb_array_elements(v_lineas) LOOP
    v_producto_id := (v_linea->>'producto_id')::uuid;
    v_lote_id := (v_linea->>'lote_id')::uuid;
    v_cantidad := (v_linea->>'cantidad')::numeric;
    v_precio_efectivo := (v_linea->>'precio_aplicado')::numeric;
    v_subtotal := (v_linea->>'subtotal')::numeric;

    INSERT INTO public.ven_detalles (
      venta_id,
      producto_id,
      lote_id,
      cantidad,
      precio_aplicado,
      subtotal
    )
    VALUES (
      v_venta_id,
      v_producto_id,
      v_lote_id,
      v_cantidad,
      v_precio_efectivo,
      v_subtotal
    );

    SELECT l.cantidad_actual, l.activo, p.nombre
    INTO v_lote
    FROM public.inv_lotes l
    LEFT JOIN public.inv_productos p ON p.id = l.producto_id
    WHERE l.id = v_lote_id
    FOR UPDATE OF l;

    PERFORM set_config('app.mov_tipo', 'salida_venta', true);
    PERFORM set_config('app.mov_ref_tipo', 'venta', true);
    PERFORM set_config('app.mov_ref_id', v_venta_id::text, true);
    PERFORM set_config('app.mov_motivo', '', true);

    v_nueva_cantidad := coalesce(v_lote.cantidad_actual, 0) - v_cantidad;

    IF v_nueva_cantidad <= 0 THEN
      UPDATE public.inv_lotes
      SET cantidad_actual = 0,
          activo = false
      WHERE id = v_lote_id;
    ELSE
      UPDATE public.inv_lotes
      SET cantidad_actual = v_nueva_cantidad
      WHERE id = v_lote_id;
    END IF;

    IF NOT v_producto_id = ANY (v_productos_afectados) THEN
      v_productos_afectados := array_append(v_productos_afectados, v_producto_id);
    END IF;
  END LOOP;

  FOREACH v_pid IN ARRAY v_productos_afectados LOOP
    SELECT coalesce(sum(l.cantidad_actual), 0)
    INTO v_stock
    FROM public.inv_lotes l
    WHERE l.producto_id = v_pid
      AND l.activo = true;

    UPDATE public.inv_productos
    SET stock_actual = greatest(v_stock, 0),
        activo = CASE WHEN v_stock <= 0 THEN false ELSE activo END
    WHERE id = v_pid;
  END LOOP;

  IF lower(trim(v_tipo_venta)) NOT IN ('crédito', 'credito') THEN
    IF v_numero_recibo IS NOT NULL THEN
      v_desc_fin := format('Venta #%s - %s', v_numero_recibo, v_tipo_venta);
    ELSE
      v_desc_fin := format('Venta Directa - %s', v_tipo_venta);
    END IF;

    INSERT INTO public.fin_transacciones (
      tipo_movimiento,
      categoria,
      monto,
      descripcion,
      usuario_id,
      venta_id
    )
    VALUES (
      'ingreso',
      'venta',
      v_total,
      v_desc_fin,
      v_usuario_id,
      v_venta_id
    );
  END IF;

  IF v_hay_rebaja AND v_solicitud_id IS NOT NULL THEN
    UPDATE public.ven_solicitudes_rebaja
    SET estado = 'completada',
        venta_id = v_venta_id
    WHERE id = v_solicitud_id
      AND estado = 'aprobada'
      AND solicitante_id = v_usuario_id
      AND venta_id IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'REBAJA_NO_AUTORIZADA';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_venta_id,
    'numero_recibo', v_numero_recibo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_venta(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_venta(jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta(jsonb, jsonb) TO authenticated;

-- =============================================================================
-- 6. Vista kardex (lectura con RLS del invocador)
-- =============================================================================
CREATE OR REPLACE VIEW public.v_kardex
WITH (security_invoker = true)
AS
SELECT
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
  p.nombre AS producto_nombre,
  p.nombre_generico AS producto_nombre_generico,
  p.concentracion AS producto_concentracion,
  m.lote_id,
  l.numero_lote AS lote_numero,
  l.laboratorio AS lote_laboratorio,
  l.codigo_barras AS lote_codigo_barras,
  m.usuario_id,
  pr.nombre AS usuario_nombre
FROM public.inv_movimientos m
JOIN public.inv_productos p ON p.id = m.producto_id
LEFT JOIN public.inv_lotes l ON l.id = m.lote_id
LEFT JOIN public.profiles pr ON pr.id = m.usuario_id;

COMMENT ON VIEW public.v_kardex IS 'Kardex legible: producto, lote y usuario. Ordenar por created_at en consultas.';

REVOKE ALL ON TABLE public.v_kardex FROM PUBLIC;
REVOKE ALL ON TABLE public.v_kardex FROM anon;
GRANT SELECT ON TABLE public.v_kardex TO authenticated;

-- =============================================================================
-- 7. Verificación (ejecutar manualmente tras aplicar la migración)
-- =============================================================================
/*
-- Conteo por tipo de movimiento
SELECT tipo, count(*) AS total
FROM public.inv_movimientos
GROUP BY tipo
ORDER BY tipo;

-- Productos donde la suma de cantidades en kardex no coincide con stock_actual
SELECT
  p.id,
  p.nombre,
  p.stock_actual,
  coalesce(s.suma_movimientos, 0) AS suma_movimientos,
  p.stock_actual - coalesce(s.suma_movimientos, 0) AS diferencia
FROM public.inv_productos p
LEFT JOIN (
  SELECT producto_id, sum(cantidad) AS suma_movimientos
  FROM public.inv_movimientos
  GROUP BY producto_id
) s ON s.producto_id = p.id
WHERE p.stock_actual IS DISTINCT FROM coalesce(s.suma_movimientos, 0)
ORDER BY abs(p.stock_actual - coalesce(s.suma_movimientos, 0)) DESC, p.nombre;
*/
