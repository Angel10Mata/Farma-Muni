// Ejemplos verificados (redondeo a Q0.05):
// E=100, CPP=8, Q=100, C=5 → CPP_nuevo=6.50; margen 30% → sugerido Q8.45
// E=0, CPP=null, Q=50, C=4 → CPP_nuevo=4.00; margen 30% → sugerido Q5.20

export type InvCostosComercial = {
  producto_id: string;
  existencia_vendible: number;
  costo_promedio: number | null;
  costo_minimo: number | null;
  costo_maximo: number | null;
  precio_venta: number;
  margen_actual_pct: number | null;
};

export function costoPromedioNuevo(params: {
  existencia: number;
  costoPromedio: number | null;
  cantidad: number;
  costo: number;
}): number {
  const { existencia, costoPromedio, cantidad, costo } = params;
  if (cantidad <= 0) return costoPromedio ?? 0;
  const valorStock = (costoPromedio ?? 0) * existencia;
  const existenciaNueva = existencia + cantidad;
  if (existenciaNueva <= 0) return costo;
  const cpp = (valorStock + cantidad * costo) / existenciaNueva;
  return Math.round(cpp * 10000) / 10000;
}

export function cppNuevoTrasCompra(params: {
  existenciaVendible: number;
  costoPromedio: number | null;
  lineasCarrito: { cantidad: number; precio_costo: number }[];
  cantidadLinea: number;
  costoLinea: number;
}): number {
  let existencia = params.existenciaVendible;
  let cpp: number | null = params.costoPromedio;
  for (const linea of params.lineasCarrito) {
    cpp = costoPromedioNuevo({
      existencia,
      costoPromedio: cpp,
      cantidad: linea.cantidad,
      costo: linea.precio_costo,
    });
    existencia += linea.cantidad;
  }
  return costoPromedioNuevo({
    existencia,
    costoPromedio: cpp,
    cantidad: params.cantidadLinea,
    costo: params.costoLinea,
  });
}

export function precioSugerido(costoPromedio: number, margenPct: number): number {
  const bruto = costoPromedio * (1 + margenPct / 100);
  const centavos = Math.round(bruto * 100);
  return Math.ceil(centavos / 5) * 5 / 100;
}

export function margenPct(precio: number, costo: number): number | null {
  if (costo <= 0) return null;
  return Math.round((precio / costo - 1) * 10000) / 100;
}

export function precioMinimoMargen(costoPromedio: number, margenMinimoPct: number): number {
  return Math.round(costoPromedio * (1 + margenMinimoPct / 100) * 100) / 100;
}

const PRECIO_EPSILON = 0.001;

export function precioBajoCostoPromedio(precio: number, costoPromedio: number): boolean {
  return precio < costoPromedio - PRECIO_EPSILON;
}

export function precioBajoMargenMinimo(
  precio: number,
  costoPromedio: number,
  margenMinimoPct: number,
): boolean {
  const margen = margenPct(precio, costoPromedio);
  return margen !== null && margen < margenMinimoPct - 0.01;
}
