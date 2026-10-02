-- Ejecutar después del script de inv_lotes: mantiene inv_productos.stock_actual al día

CREATE OR REPLACE FUNCTION public.inv_sync_producto_stock_from_lotes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.producto_id, OLD.producto_id);
  IF pid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.inv_productos p
  SET stock_actual = COALESCE(
    (
      SELECT SUM(l.cantidad_actual)
      FROM public.inv_lotes l
      WHERE l.producto_id = pid
        AND l.activo = true
    ),
    0
  )
  WHERE p.id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS inv_lotes_sync_stock ON public.inv_lotes;
CREATE TRIGGER inv_lotes_sync_stock
AFTER INSERT OR UPDATE OR DELETE ON public.inv_lotes
FOR EACH ROW
EXECUTE FUNCTION public.inv_sync_producto_stock_from_lotes();

UPDATE public.inv_productos p
SET stock_actual = COALESCE(
  (
    SELECT SUM(l.cantidad_actual)
    FROM public.inv_lotes l
    WHERE l.producto_id = p.id
      AND l.activo = true
  ),
  0
);
