-- =============================================================================
-- FarmaMuni — Endurecimiento RLS (idempotente)
-- Ejecutar en Supabase → SQL Editor. NO incluye datos de prueba.
--
-- Módulos que usan createClient() (sujetos a RLS) y conviene probar tras aplicar:
--   • Perfil / sesión: profiles (UserProvider, resolveUserRole, formularios perfil)
--   • Proxy / login: app_settings, authorized_devices
--   • Inventario: inv_productos, inv_lotes, fin_transacciones (baja por vencimiento)
--   • Proveedores: inv_proveedores, inv_compras, inv_compras_detalles, fin_transacciones
--   • Ventas: ventas, ven_detalles, inv_* (RPC registrar_venta SECURITY INVOKER),
--             ven_solicitudes_rebaja, ven_ventas_bitacora, fin_transacciones
--   • Clientes / créditos: ven_clientes, ventas, fin_transacciones (lecturas)
--   • Finanzas: fin_transacciones, fin_gastos_fijos (si existe)
--   • Push: push_subscriptions
-- Las server actions con SUPABASE_SERVICE_ROLE_KEY / createAdminClient() omiten RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funciones auxiliares
-- -----------------------------------------------------------------------------

-- Ya definida en db/ven_ventas_bitacora.sql; se reemplaza solo si hace falta alinear.
-- Comprueba: debe seguir leyendo profiles.rol para auth.uid().
-- Si en tu proyecto el super solo está en app_metadata, ajusta esta función.
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.rol IN ('admin', 'super')
  );
$$;

COMMENT ON FUNCTION public.is_admin_or_super() IS
  'True si el usuario autenticado tiene rol admin o super en profiles.';

-- Roles permitidos: array de textos (ej. ARRAY[''admin'',''ventas'']).
CREATE OR REPLACE FUNCTION public.tiene_rol(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.rol = ANY (roles)
  );
$$;

COMMENT ON FUNCTION public.tiene_rol(text[]) IS
  'True si profiles.rol del usuario autenticado está en el array (SECURITY DEFINER).';

GRANT EXECUTE ON FUNCTION public.is_admin_or_super() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tiene_rol(text[]) TO authenticated;

-- Arrays de roles reutilizados (documentación; en políticas se pasa literal ARRAY[...]).
-- Lectura amplia catálogo / operación diaria
--   super, admin, ventas, inventario, finanzas, proveedores, clientes, user
-- Escritura inventario
--   super, admin, inventario
-- Escritura ventas (cobro)
--   super, admin, ventas
-- Escritura finanzas
--   super, admin, finanzas
-- Compras / proveedores (escritura)
--   super, admin, inventario, proveedores, finanzas
-- Clientes (escritura)
--   super, admin, ventas, clientes, finanzas

-- -----------------------------------------------------------------------------
-- 1. profiles
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total para usuarios autenticados" ON public.profiles;

DROP POLICY IF EXISTS seg_profiles_select ON public.profiles;
CREATE POLICY seg_profiles_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS seg_profiles_update ON public.profiles;
CREATE POLICY seg_profiles_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin_or_super()
  )
  WITH CHECK (
    id = auth.uid()
    OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS seg_profiles_insert ON public.profiles;
CREATE POLICY seg_profiles_insert
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super());

DROP POLICY IF EXISTS seg_profiles_delete ON public.profiles;
CREATE POLICY seg_profiles_delete
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super());

-- Impide que usuarios no admin cambien rol o activo (aunque la política UPDATE lo permita en otras columnas).
CREATE OR REPLACE FUNCTION public.profiles_impedir_cambio_rol_activo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_super() THEN
    IF NEW.rol IS DISTINCT FROM OLD.rol THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar el rol del perfil.';
    END IF;
    IF NEW.activo IS DISTINCT FROM OLD.activo THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar el estado activo del perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seg_profiles_guard_rol_activo ON public.profiles;
CREATE TRIGGER seg_profiles_guard_rol_activo
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_impedir_cambio_rol_activo();

-- -----------------------------------------------------------------------------
-- 2. inv_compras e inv_compras_detalles
-- -----------------------------------------------------------------------------

ALTER TABLE public.inv_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_compras_detalles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_compras_authenticated_all" ON public.inv_compras;
DROP POLICY IF EXISTS "inv_compras_detalles_authenticated_all" ON public.inv_compras_detalles;

DROP POLICY IF EXISTS seg_inv_compras_all ON public.inv_compras;
CREATE POLICY seg_inv_compras_all
  ON public.inv_compras
  FOR ALL
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores', 'finanzas'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores', 'finanzas'])
  );

DROP POLICY IF EXISTS seg_inv_compras_detalles_all ON public.inv_compras_detalles;
CREATE POLICY seg_inv_compras_detalles_all
  ON public.inv_compras_detalles
  FOR ALL
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores', 'finanzas'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores', 'finanzas'])
  );

-- -----------------------------------------------------------------------------
-- 3. Resto de tablas (políticas por módulo)
-- -----------------------------------------------------------------------------

-- ---------- inv_productos ----------
ALTER TABLE public.inv_productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_inv_productos_select ON public.inv_productos;
CREATE POLICY seg_inv_productos_select
  ON public.inv_productos
  FOR SELECT
  TO authenticated
  USING (
    public.tiene_rol(ARRAY[
      'super', 'admin', 'ventas', 'inventario', 'finanzas', 'proveedores', 'clientes', 'user'
    ])
  );

DROP POLICY IF EXISTS seg_inv_productos_write ON public.inv_productos;
CREATE POLICY seg_inv_productos_write
  ON public.inv_productos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario'])
  );

DROP POLICY IF EXISTS seg_inv_productos_update ON public.inv_productos;
CREATE POLICY seg_inv_productos_update
  ON public.inv_productos
  FOR UPDATE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'ventas'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'ventas'])
  );

DROP POLICY IF EXISTS seg_inv_productos_delete ON public.inv_productos;
CREATE POLICY seg_inv_productos_delete
  ON public.inv_productos
  FOR DELETE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario'])
  );

-- ---------- inv_lotes ----------
ALTER TABLE public.inv_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_inv_lotes_select ON public.inv_lotes;
CREATE POLICY seg_inv_lotes_select
  ON public.inv_lotes
  FOR SELECT
  TO authenticated
  USING (
    public.tiene_rol(ARRAY[
      'super', 'admin', 'ventas', 'inventario', 'finanzas', 'proveedores', 'clientes', 'user'
    ])
  );

DROP POLICY IF EXISTS seg_inv_lotes_insert ON public.inv_lotes;
CREATE POLICY seg_inv_lotes_insert
  ON public.inv_lotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores'])
  );

DROP POLICY IF EXISTS seg_inv_lotes_update ON public.inv_lotes;
CREATE POLICY seg_inv_lotes_update
  ON public.inv_lotes
  FOR UPDATE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'ventas', 'proveedores'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'ventas', 'proveedores'])
  );

DROP POLICY IF EXISTS seg_inv_lotes_delete ON public.inv_lotes;
CREATE POLICY seg_inv_lotes_delete
  ON public.inv_lotes
  FOR DELETE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario'])
  );

-- ---------- inv_proveedores ----------
ALTER TABLE public.inv_proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_inv_proveedores_select ON public.inv_proveedores;
CREATE POLICY seg_inv_proveedores_select
  ON public.inv_proveedores
  FOR SELECT
  TO authenticated
  USING (
    public.tiene_rol(ARRAY[
      'super', 'admin', 'inventario', 'proveedores', 'finanzas', 'ventas'
    ])
  );

DROP POLICY IF EXISTS seg_inv_proveedores_write ON public.inv_proveedores;
DROP POLICY IF EXISTS seg_inv_proveedores_insert ON public.inv_proveedores;
DROP POLICY IF EXISTS seg_inv_proveedores_update ON public.inv_proveedores;
DROP POLICY IF EXISTS seg_inv_proveedores_delete ON public.inv_proveedores;

CREATE POLICY seg_inv_proveedores_insert
  ON public.inv_proveedores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores', 'finanzas'])
  );

CREATE POLICY seg_inv_proveedores_update
  ON public.inv_proveedores
  FOR UPDATE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores', 'finanzas'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'inventario', 'proveedores', 'finanzas'])
  );

CREATE POLICY seg_inv_proveedores_delete
  ON public.inv_proveedores
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super());

-- ---------- ven_clientes (clientes) ----------
ALTER TABLE public.ven_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_ven_clientes_select ON public.ven_clientes;
CREATE POLICY seg_ven_clientes_select
  ON public.ven_clientes
  FOR SELECT
  TO authenticated
  USING (
    public.tiene_rol(ARRAY[
      'super', 'admin', 'ventas', 'clientes', 'finanzas', 'inventario', 'user'
    ])
  );

DROP POLICY IF EXISTS seg_ven_clientes_write ON public.ven_clientes;
CREATE POLICY seg_ven_clientes_write
  ON public.ven_clientes
  FOR ALL
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'ventas', 'clientes', 'finanzas'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'ventas', 'clientes', 'finanzas'])
  );

-- ---------- ventas ----------
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_ventas_select ON public.ventas;
CREATE POLICY seg_ventas_select
  ON public.ventas
  FOR SELECT
  TO authenticated
  USING (
    public.tiene_rol(ARRAY[
      'super', 'admin', 'ventas', 'finanzas', 'clientes', 'inventario', 'user'
    ])
  );

DROP POLICY IF EXISTS seg_ventas_insert ON public.ventas;
CREATE POLICY seg_ventas_insert
  ON public.ventas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'ventas'])
    AND usuario_id = auth.uid()
  );

DROP POLICY IF EXISTS seg_ventas_update ON public.ventas;
CREATE POLICY seg_ventas_update
  ON public.ventas
  FOR UPDATE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin'])
  );

DROP POLICY IF EXISTS seg_ventas_delete ON public.ventas;
CREATE POLICY seg_ventas_delete
  ON public.ventas
  FOR DELETE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin'])
  );

-- ---------- ven_detalles ----------
ALTER TABLE public.ven_detalles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_ven_detalles_select ON public.ven_detalles;
CREATE POLICY seg_ven_detalles_select
  ON public.ven_detalles
  FOR SELECT
  TO authenticated
  USING (
    public.tiene_rol(ARRAY[
      'super', 'admin', 'ventas', 'finanzas', 'clientes', 'inventario', 'user'
    ])
  );

DROP POLICY IF EXISTS seg_ven_detalles_insert ON public.ven_detalles;
CREATE POLICY seg_ven_detalles_insert
  ON public.ven_detalles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'ventas'])
  );

DROP POLICY IF EXISTS seg_ven_detalles_update ON public.ven_detalles;
CREATE POLICY seg_ven_detalles_update
  ON public.ven_detalles
  FOR UPDATE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin'])
  );

DROP POLICY IF EXISTS seg_ven_detalles_delete ON public.ven_detalles;
CREATE POLICY seg_ven_detalles_delete
  ON public.ven_detalles
  FOR DELETE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin'])
  );

-- ---------- fin_transacciones (finanzas / ventas / compras) ----------
ALTER TABLE public.fin_transacciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_fin_transacciones_select ON public.fin_transacciones;
CREATE POLICY seg_fin_transacciones_select
  ON public.fin_transacciones
  FOR SELECT
  TO authenticated
  USING (
    public.tiene_rol(ARRAY[
      'super', 'admin', 'finanzas', 'ventas', 'proveedores', 'inventario', 'clientes'
    ])
  );

DROP POLICY IF EXISTS seg_fin_transacciones_insert ON public.fin_transacciones;
CREATE POLICY seg_fin_transacciones_insert
  ON public.fin_transacciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'finanzas', 'ventas', 'inventario', 'proveedores'])
    AND (usuario_id = auth.uid() OR public.is_admin_or_super())
  );

DROP POLICY IF EXISTS seg_fin_transacciones_update ON public.fin_transacciones;
CREATE POLICY seg_fin_transacciones_update
  ON public.fin_transacciones
  FOR UPDATE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'finanzas'])
  )
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'finanzas'])
  );

DROP POLICY IF EXISTS seg_fin_transacciones_delete ON public.fin_transacciones;
CREATE POLICY seg_fin_transacciones_delete
  ON public.fin_transacciones
  FOR DELETE
  TO authenticated
  USING (
    public.tiene_rol(ARRAY['super', 'admin', 'finanzas'])
  );

-- ---------- ven_solicitudes_rebaja ----------
ALTER TABLE public.ven_solicitudes_rebaja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_ven_solicitudes_rebaja_select ON public.ven_solicitudes_rebaja;
CREATE POLICY seg_ven_solicitudes_rebaja_select
  ON public.ven_solicitudes_rebaja
  FOR SELECT
  TO authenticated
  USING (
    solicitante_id = auth.uid()
    OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS seg_ven_solicitudes_rebaja_insert ON public.ven_solicitudes_rebaja;
CREATE POLICY seg_ven_solicitudes_rebaja_insert
  ON public.ven_solicitudes_rebaja
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'ventas'])
    AND solicitante_id = auth.uid()
  );

DROP POLICY IF EXISTS seg_ven_solicitudes_rebaja_update ON public.ven_solicitudes_rebaja;
CREATE POLICY seg_ven_solicitudes_rebaja_update
  ON public.ven_solicitudes_rebaja
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_super()
    OR (solicitante_id = auth.uid() AND estado IN ('pendiente', 'rechazada'))
  )
  WITH CHECK (
    public.is_admin_or_super()
    OR solicitante_id = auth.uid()
  );

-- ---------- ven_ventas_bitacora (ya tenía políticas; se mantienen alineadas) ----------
ALTER TABLE public.ven_ventas_bitacora ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ven_ventas_bitacora_select ON public.ven_ventas_bitacora;
CREATE POLICY ven_ventas_bitacora_select
  ON public.ven_ventas_bitacora
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super());

DROP POLICY IF EXISTS ven_ventas_bitacora_insert ON public.ven_ventas_bitacora;
CREATE POLICY ven_ventas_bitacora_insert
  ON public.ven_ventas_bitacora
  FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND public.is_admin_or_super()
  );

-- ---------- app_settings ----------
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_app_settings_select ON public.app_settings;
CREATE POLICY seg_app_settings_select
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS seg_app_settings_write ON public.app_settings;
CREATE POLICY seg_app_settings_write
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_super())
  WITH CHECK (public.is_admin_or_super());

-- ---------- authorized_devices ----------
ALTER TABLE public.authorized_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_authorized_devices_select ON public.authorized_devices;
CREATE POLICY seg_authorized_devices_select
  ON public.authorized_devices
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS seg_authorized_devices_insert ON public.authorized_devices;
CREATE POLICY seg_authorized_devices_insert
  ON public.authorized_devices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS seg_authorized_devices_update ON public.authorized_devices;
CREATE POLICY seg_authorized_devices_update
  ON public.authorized_devices
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_super())
  WITH CHECK (public.is_admin_or_super());

DROP POLICY IF EXISTS seg_authorized_devices_delete ON public.authorized_devices;
CREATE POLICY seg_authorized_devices_delete
  ON public.authorized_devices
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_super()
  );

-- ---------- push_subscriptions ----------
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seg_push_subscriptions_select ON public.push_subscriptions;
CREATE POLICY seg_push_subscriptions_select
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_super()
  );

DROP POLICY IF EXISTS seg_push_subscriptions_insert ON public.push_subscriptions;
CREATE POLICY seg_push_subscriptions_insert
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS seg_push_subscriptions_update ON public.push_subscriptions;
CREATE POLICY seg_push_subscriptions_update
  ON public.push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_super());

DROP POLICY IF EXISTS seg_push_subscriptions_delete ON public.push_subscriptions;
CREATE POLICY seg_push_subscriptions_delete
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_super());

-- ---------- fin_gastos_fijos (cron / finanzas) ----------
DO $$
BEGIN
  IF to_regclass('public.fin_gastos_fijos') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.fin_gastos_fijos ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS seg_fin_gastos_fijos_select ON public.fin_gastos_fijos';
    EXECUTE $p$
      CREATE POLICY seg_fin_gastos_fijos_select
        ON public.fin_gastos_fijos
        FOR SELECT
        TO authenticated
        USING (
          public.tiene_rol(ARRAY['super', 'admin', 'finanzas'])
        )
    $p$;

    EXECUTE 'DROP POLICY IF EXISTS seg_fin_gastos_fijos_write ON public.fin_gastos_fijos';
    EXECUTE $p$
      CREATE POLICY seg_fin_gastos_fijos_write
        ON public.fin_gastos_fijos
        FOR ALL
        TO authenticated
        USING (
          public.tiene_rol(ARRAY['super', 'admin', 'finanzas'])
        )
        WITH CHECK (
          public.tiene_rol(ARRAY['super', 'admin', 'finanzas'])
        )
    $p$;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- REVISAR: tablas que pueden existir en tu proyecto con nombres distintos o
-- políticas permisivas antiguas no listadas en el repo. Tras ejecutar, usa las
-- consultas de verificación al final. Si falla algún ALTER TABLE, comenta el bloque.
-- -----------------------------------------------------------------------------
-- REVISAR: tabla "creditos" / "abonos" dedicada — en FarmaMuni los abonos viven
-- en fin_transacciones (categoria abono_cliente). No se crean políticas extra.
-- REVISAR: trigger handle_new_user en auth.users que inserta en profiles — debe
-- ejecutarse como SECURITY DEFINER o con service role; si el registro público falla,
-- no relajes RLS: ajusta el trigger.
-- REVISAR: Storage bucket Imagenes_Farmacia — políticas en storage.objects, no aquí.
-- REVISAR: si tienes políticas FOR ALL con USING (true) en ventas/inv_* creadas a
-- mano en Supabase, elimínalas manualmente (ver consulta 2 abajo).

-- -----------------------------------------------------------------------------
-- 5. Verificación
-- -----------------------------------------------------------------------------

-- 1) Todas las políticas public
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text AS using_expr,
  with_check::text AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2) Políticas sospechosas (USING o WITH CHECK literal true)
SELECT
  tablename,
  policyname,
  cmd,
  qual::text AS using_expr,
  with_check::text AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text = 'true'
    OR with_check::text = 'true'
  )
ORDER BY tablename, policyname;

-- 3) Tablas public con RLS desactivado
SELECT
  c.relname AS tabla,
  c.relrowsecurity AS rls_activo,
  c.relforcerowsecurity AS rls_forzado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'profiles',
    'inv_compras',
    'inv_compras_detalles',
    'inv_productos',
    'inv_lotes',
    'inv_proveedores',
    'ven_clientes',
    'ventas',
    'ven_detalles',
    'fin_transacciones',
    'ven_solicitudes_rebaja',
    'ven_ventas_bitacora',
    'app_settings',
    'authorized_devices',
    'push_subscriptions',
    'fin_gastos_fijos'
  )
ORDER BY c.relname;
