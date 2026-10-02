-- Políticas RLS para registrar compras (cabecera + detalle) con el cliente autenticado

ALTER TABLE public.inv_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_compras_detalles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_compras_authenticated_all" ON public.inv_compras;
CREATE POLICY "inv_compras_authenticated_all"
ON public.inv_compras
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "inv_compras_detalles_authenticated_all" ON public.inv_compras_detalles;
CREATE POLICY "inv_compras_detalles_authenticated_all"
ON public.inv_compras_detalles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
