-- Ejecutar en Supabase → SQL Editor (una sola vez).
-- Registra venta + detalles + descuento de lotes + ingreso financiero en una transacción.

create or replace function public.registrar_venta(p_venta jsonb, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_usuario_id uuid;
  v_cliente_id uuid;
  v_tipo_venta text;
  v_total numeric;
  v_observaciones text;
  v_venta_id uuid;
  v_numero_recibo bigint;
  v_hoy_gt date;
  v_item jsonb;
  v_producto_id uuid;
  v_lote_id uuid;
  v_cantidad numeric;
  v_precio_aplicado numeric;
  v_subtotal numeric;
  v_lote record;
  v_nueva_cantidad numeric;
  v_productos_afectados uuid[] := '{}';
  v_stock numeric;
  v_pid uuid;
  v_desc_fin text;
  v_nombre_producto text;
begin
  v_usuario_id := auth.uid();
  if v_usuario_id is null then
    raise exception 'Sesión no válida o expirada.';
  end if;

  if p_venta is null or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Datos de venta inválidos.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe contener al menos un producto.';
  end if;

  if coalesce((p_venta->>'usuario_id'), '') <> v_usuario_id::text then
    raise exception 'El usuario de la venta no coincide con la sesión.';
  end if;

  v_cliente_id := nullif(p_venta->>'cliente_id', '')::uuid;
  v_tipo_venta := coalesce(p_venta->>'tipo_venta', '');
  v_total := coalesce((p_venta->>'total')::numeric, 0);
  v_observaciones := nullif(trim(p_venta->>'observaciones'), '');

  v_hoy_gt := (timezone('America/Guatemala', now()))::date;

  insert into public.ventas (
    cliente_id,
    usuario_id,
    tipo_venta,
    total,
    observaciones
  )
  values (
    v_cliente_id,
    v_usuario_id,
    v_tipo_venta,
    v_total,
    v_observaciones
  )
  returning id, numero_recibo into v_venta_id, v_numero_recibo;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_producto_id := (v_item->>'producto_id')::uuid;
    v_lote_id := nullif(v_item->>'lote_id', '')::uuid;
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_precio_aplicado := (v_item->>'precio_aplicado')::numeric;
    v_subtotal := (v_item->>'subtotal')::numeric;

    if v_producto_id is null then
      raise exception 'Cada línea debe incluir producto_id.';
    end if;

    if v_lote_id is null then
      raise exception 'Cada línea de venta debe tener un lote asignado.';
    end if;

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad inválida en un detalle de venta.';
    end if;

    insert into public.ven_detalles (
      venta_id,
      producto_id,
      lote_id,
      cantidad,
      precio_aplicado,
      subtotal
    )
    values (
      v_venta_id,
      v_producto_id,
      v_lote_id,
      v_cantidad,
      coalesce(v_precio_aplicado, 0),
      coalesce(v_subtotal, 0)
    );

    select
      l.id,
      l.producto_id,
      l.cantidad_actual,
      l.activo,
      l.fecha_vencimiento,
      p.nombre as producto_nombre
    into v_lote
    from public.inv_lotes l
    left join public.inv_productos p on p.id = l.producto_id
    where l.id = v_lote_id
    for update of l;

    if not found then
      raise exception 'Lote no válido o inactivo para la venta.';
    end if;

    if not coalesce(v_lote.activo, false) then
      raise exception 'Lote no válido o inactivo para la venta.';
    end if;

    if v_lote.producto_id is distinct from v_producto_id then
      raise exception 'El lote no corresponde al producto de la venta.';
    end if;

    if v_lote.fecha_vencimiento is not null
      and v_lote.fecha_vencimiento::date < v_hoy_gt then
      raise exception 'No se puede vender un lote vencido.';
    end if;

    v_nombre_producto := coalesce(v_lote.producto_nombre, 'Producto');

    if coalesce(v_lote.cantidad_actual, 0) < v_cantidad then
      raise exception 'Stock insuficiente en lote para % (Disponibles: %, Solicitados: %).',
        v_nombre_producto,
        coalesce(v_lote.cantidad_actual, 0),
        v_cantidad;
    end if;

    v_nueva_cantidad := coalesce(v_lote.cantidad_actual, 0) - v_cantidad;

    if v_nueva_cantidad <= 0 then
      update public.inv_lotes
      set cantidad_actual = 0,
          activo = false
      where id = v_lote_id;
    else
      update public.inv_lotes
      set cantidad_actual = v_nueva_cantidad
      where id = v_lote_id;
    end if;

    if not v_producto_id = any (v_productos_afectados) then
      v_productos_afectados := array_append(v_productos_afectados, v_producto_id);
    end if;
  end loop;

  foreach v_pid in array v_productos_afectados loop
    select coalesce(sum(l.cantidad_actual), 0)
    into v_stock
    from public.inv_lotes l
    where l.producto_id = v_pid
      and l.activo = true;

    update public.inv_productos
    set stock_actual = greatest(v_stock, 0),
        activo = case when v_stock <= 0 then false else activo end
    where id = v_pid;
  end loop;

  if lower(trim(v_tipo_venta)) not in ('crédito', 'credito') then
    if v_numero_recibo is not null then
      v_desc_fin := format('Venta #%s - %s', v_numero_recibo, v_tipo_venta);
    else
      v_desc_fin := format('Venta Directa - %s', v_tipo_venta);
    end if;

    insert into public.fin_transacciones (
      tipo_movimiento,
      categoria,
      monto,
      descripcion,
      usuario_id,
      venta_id
    )
    values (
      'ingreso',
      'venta',
      v_total,
      v_desc_fin,
      v_usuario_id,
      v_venta_id
    );
  end if;

  return jsonb_build_object(
    'id', v_venta_id,
    'numero_recibo', v_numero_recibo
  );
end;
$$;

grant execute on function public.registrar_venta(jsonb, jsonb) to authenticated;
