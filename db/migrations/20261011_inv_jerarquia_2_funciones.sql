-- FarmaMuni · Fase 2: registrar compra atómica (compra + detalles + lotes + finanzas).
-- Kardex: set_config antes de cada INSERT en inv_lotes (trigger inv_lotes_kardex_trg).
-- No insertar en inv_movimientos ni actualizar stock_actual manualmente.

CREATE OR REPLACE FUNCTION public.registrar_compra(p_compra jsonb, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_usuario_id uuid;
  v_proveedor_id uuid;
  v_estado_pago text;
  v_numero_factura text;
  v_fecha_vencimiento_pago date;
  v_observaciones text;
  v_pagado boolean;
  v_total numeric := 0;
  v_compra_id uuid;
  v_item jsonb;
  v_producto_id uuid;
  v_codigo_barras text;
  v_numero_lote text;
  v_fecha_vencimiento date;
  v_ubicacion text;
  v_cantidad numeric;
  v_precio_costo numeric;
  v_subtotal numeric;
  v_actualizar_precio boolean;
  v_precio_venta numeric;
  v_detalle_id uuid;
  v_dup record;
  v_motivo_kardex text;
BEGIN
  v_usuario_id := auth.uid();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida o expirada.';
  END IF;

  IF to_regprocedure('public.tiene_rol(text[])') IS NOT NULL THEN
    IF NOT public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores', 'finanzas']) THEN
      RAISE EXCEPTION 'No autorizado para registrar compras.';
    END IF;
  ELSIF NOT public.is_admin_or_super() THEN
    RAISE EXCEPTION 'No autorizado para registrar compras.';
  END IF;

  IF p_compra IS NULL OR p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Datos de compra inválidos.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La compra debe contener al menos un producto.';
  END IF;

  v_proveedor_id := nullif(p_compra->>'proveedor_id', '')::uuid;
  IF v_proveedor_id IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar un proveedor.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.inv_proveedores pr WHERE pr.id = v_proveedor_id) THEN
    RAISE EXCEPTION 'Proveedor no encontrado.';
  END IF;

  v_estado_pago := coalesce(trim(p_compra->>'estado_pago'), '');
  v_pagado := lower(v_estado_pago) = 'pagado';
  v_numero_factura := trim(coalesce(p_compra->>'numero_factura', ''));
  IF v_numero_factura = '' THEN
    RAISE EXCEPTION 'El número de factura es obligatorio.';
  END IF;

  v_observaciones := nullif(trim(p_compra->>'observaciones'), '');
  v_fecha_vencimiento_pago := nullif(left(trim(coalesce(p_compra->>'fecha_vencimiento_pago', '')), 10), '')::date;

  IF NOT v_pagado AND v_fecha_vencimiento_pago IS NULL THEN
    RAISE EXCEPTION 'La fecha de vencimiento de pago es obligatoria para compras a crédito.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS e(value)
    GROUP BY lower(trim(e.value->>'codigo_barras'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Hay códigos de barras duplicados en el mismo pedido.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_codigo_barras := trim(coalesce(v_item->>'codigo_barras', ''));
    IF v_codigo_barras = '' THEN
      RAISE EXCEPTION 'Cada lote debe tener código de barras.';
    END IF;

    SELECT l.codigo_barras, p.nombre AS producto_nombre, l.numero_lote
    INTO v_dup
    FROM public.inv_lotes l
    JOIN public.inv_productos p ON p.id = l.producto_id
    WHERE l.codigo_barras = v_codigo_barras
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'El código de barras ya pertenece a %, lote %.',
        coalesce(trim(v_dup.producto_nombre), 'otro producto'),
        coalesce(trim(v_dup.numero_lote), '—');
    END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_precio_costo := (v_item->>'precio_costo')::numeric;
    IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida en un detalle de compra.';
    END IF;
    IF v_precio_costo IS NULL OR v_precio_costo < 0 THEN
      RAISE EXCEPTION 'Precio de costo inválido en un detalle de compra.';
    END IF;
    v_total := v_total + (v_cantidad * v_precio_costo);
  END LOOP;

  INSERT INTO public.inv_compras (
    proveedor_id,
    total,
    estado_pago,
    fecha_pago,
    numero_factura,
    fecha_vencimiento_pago,
    observaciones
  )
  VALUES (
    v_proveedor_id,
    v_total,
    CASE WHEN v_pagado THEN 'Pagado' ELSE v_estado_pago END,
    CASE WHEN v_pagado THEN now() ELSE NULL END,
    v_numero_factura,
    CASE WHEN v_pagado THEN NULL ELSE v_fecha_vencimiento_pago END,
    v_observaciones
  )
  RETURNING id INTO v_compra_id;

  v_motivo_kardex := coalesce(v_observaciones, '');

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_producto_id := nullif(v_item->>'producto_id', '')::uuid;
    IF v_producto_id IS NULL THEN
      RAISE EXCEPTION 'Cada línea debe incluir producto_id.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.inv_productos p WHERE p.id = v_producto_id) THEN
      RAISE EXCEPTION 'Producto comercial no encontrado.';
    END IF;

    v_codigo_barras := trim(v_item->>'codigo_barras');
    v_numero_lote := trim(coalesce(v_item->>'numero_lote', ''));
    v_fecha_vencimiento := nullif(left(trim(coalesce(v_item->>'fecha_vencimiento', '')), 10), '')::date;
    v_ubicacion := nullif(trim(coalesce(v_item->>'ubicacion', '')), '');
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_precio_costo := (v_item->>'precio_costo')::numeric;
    v_subtotal := coalesce((v_item->>'subtotal')::numeric, v_cantidad * v_precio_costo);
    v_actualizar_precio := coalesce((v_item->>'actualizar_precio_venta')::boolean, false);
    v_precio_venta := (v_item->>'precio_venta')::numeric;

    IF v_numero_lote = '' THEN
      RAISE EXCEPTION 'Número de lote obligatorio.';
    END IF;
    IF v_fecha_vencimiento IS NULL THEN
      RAISE EXCEPTION 'Fecha de vencimiento obligatoria.';
    END IF;

    IF v_actualizar_precio AND v_precio_venta IS NOT NULL AND v_precio_venta >= 0 THEN
      UPDATE public.inv_productos
      SET precio_base = v_precio_venta
      WHERE id = v_producto_id;
    END IF;

    INSERT INTO public.inv_compras_detalles (
      compra_id,
      producto_id,
      cantidad,
      precio_costo,
      subtotal
    )
    VALUES (
      v_compra_id,
      v_producto_id,
      v_cantidad,
      v_precio_costo,
      v_subtotal
    )
    RETURNING id INTO v_detalle_id;

    PERFORM set_config('app.mov_tipo', 'entrada_manual', true);
    PERFORM set_config('app.mov_ref_tipo', '', true);
    PERFORM set_config('app.mov_ref_id', '', true);
    PERFORM set_config('app.mov_motivo', v_motivo_kardex, true);

    INSERT INTO public.inv_lotes (
      producto_id,
      proveedor_id,
      compra_detalle_id,
      codigo_barras,
      numero_lote,
      cantidad_inicial,
      cantidad_actual,
      precio_costo,
      fecha_vencimiento,
      ubicacion,
      activo
    )
    VALUES (
      v_producto_id,
      v_proveedor_id,
      v_detalle_id,
      v_codigo_barras,
      v_numero_lote,
      v_cantidad,
      v_cantidad,
      v_precio_costo,
      v_fecha_vencimiento,
      v_ubicacion,
      true
    );
  END LOOP;

  IF v_pagado THEN
    INSERT INTO public.fin_transacciones (
      tipo_movimiento,
      categoria,
      monto,
      descripcion,
      usuario_id,
      compra_id
    )
    VALUES (
      'egreso',
      'pago_proveedor',
      v_total,
      'Pago inmediato de compra al registrar',
      v_usuario_id,
      v_compra_id
    );
  END IF;

  RETURN jsonb_build_object('compra_id', v_compra_id);
EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM LIKE '%inv_compras_proveedor_numero_factura%' OR SQLERRM LIKE '%numero_factura%' THEN
      RAISE EXCEPTION 'Ya existe una compra con ese número de factura para este proveedor.';
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_compra(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_compra(jsonb, jsonb) TO authenticated;
