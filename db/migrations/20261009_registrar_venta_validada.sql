-- FarmaMuni: registrar_venta con precios y totales calculados en servidor.
-- Ejecutar en Supabase → SQL Editor después de 20261008_rpc_registrar_venta.sql.

-- -----------------------------------------------------------------------------
-- Columna estado en ventas
-- -----------------------------------------------------------------------------
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'activa';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ventas_estado_check'
      AND conrelid = 'public.ventas'::regclass
  ) THEN
    ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_estado_check
      CHECK (estado IN ('activa', 'anulada'));
  END IF;
END $$;

UPDATE public.ventas
SET estado = 'anulada'
WHERE coalesce(observaciones, '') LIKE '%[ANULADA]%'
  AND coalesce(estado, 'activa') IS DISTINCT FROM 'anulada';

-- -----------------------------------------------------------------------------
-- Función registrar_venta validada
-- -----------------------------------------------------------------------------
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
