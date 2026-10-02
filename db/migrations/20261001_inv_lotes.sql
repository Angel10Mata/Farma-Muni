-- Esquema aplicado en producción (referencia). Si ya ejecutaste el script manual, omite este archivo.

CREATE TABLE IF NOT EXISTS inv_lotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id uuid NOT NULL REFERENCES inv_productos(id) ON DELETE CASCADE,
    compra_detalle_id uuid REFERENCES inv_compras_detalles(id) ON DELETE SET NULL,
    codigo_barras text UNIQUE NOT NULL,
    numero_lote text NOT NULL,
    cantidad_inicial numeric NOT NULL DEFAULT 0,
    cantidad_actual numeric NOT NULL DEFAULT 0,
    precio_costo numeric NOT NULL DEFAULT 0,
    fecha_vencimiento date NOT NULL,
    ubicacion text,
    activo boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_lotes_codigo_barras ON inv_lotes(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_inv_lotes_producto_id ON inv_lotes(producto_id);

ALTER TABLE ven_detalles
ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES inv_lotes(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_ven_detalles_lote_id ON ven_detalles(lote_id);

ALTER TABLE inv_productos
DROP COLUMN IF EXISTS codigo,
DROP COLUMN IF EXISTS fecha_vencimiento,
DROP COLUMN IF EXISTS numero_lote,
DROP COLUMN IF EXISTS ubicacion,
DROP COLUMN IF EXISTS precio_costo,
DROP COLUMN IF EXISTS imagen_url_2,
DROP COLUMN IF EXISTS imagen_url_3;

ALTER TABLE inv_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso total a usuarios autenticados en inv_lotes" ON inv_lotes;
CREATE POLICY "Permitir acceso total a usuarios autenticados en inv_lotes"
ON inv_lotes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
