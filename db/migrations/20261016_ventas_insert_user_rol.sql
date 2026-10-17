-- POS: rol user puede registrar ventas (alineado con app-modules y requireVentas).

DROP POLICY IF EXISTS seg_ventas_insert ON public.ventas;
CREATE POLICY seg_ventas_insert
  ON public.ventas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'ventas', 'user'])
    AND usuario_id = auth.uid()
  );

DROP POLICY IF EXISTS seg_ven_detalles_insert ON public.ven_detalles;
CREATE POLICY seg_ven_detalles_insert
  ON public.ven_detalles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.tiene_rol(ARRAY['super', 'admin', 'ventas', 'user'])
  );image.png
