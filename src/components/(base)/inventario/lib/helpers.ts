export function inicioDiaLocal(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isProductoProximoAVencer(
  fechaVencimiento?: string | null,
  meses = 4,
): boolean {
  if (!fechaVencimiento) return false;
  const today = inicioDiaLocal();
  const expDate = inicioDiaLocal(new Date(fechaVencimiento));
  const limitDate = new Date(today);
  limitDate.setMonth(limitDate.getMonth() + meses);
  return expDate <= limitDate && expDate >= today;
}

export function isProductoVencido(fechaVencimiento?: string | null): boolean {
  if (!fechaVencimiento) return false;
  const expDate = inicioDiaLocal(new Date(fechaVencimiento));
  return expDate < inicioDiaLocal();
}

export function diasRestantesVencimiento(fechaVencimiento?: string | null): number | null {
  if (!fechaVencimiento) return null;
  const expDate = inicioDiaLocal(new Date(fechaVencimiento));
  const today = inicioDiaLocal();
  const diffMs = expDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function etiquetaEstadoVencimiento(fechaVencimiento?: string | null): string {
  if (!fechaVencimiento) return "Sin fecha";
  if (isProductoVencido(fechaVencimiento)) return "Vencido";
  if (isProductoProximoAVencer(fechaVencimiento)) return "Por vencer";
  return "Vigente";
}

export function patchInvLoteCantidadActual(nuevaCantidad: number): {
  cantidad_actual: number;
  activo?: boolean;
} {
  if (nuevaCantidad <= 0) {
    return { cantidad_actual: 0, activo: false };
  }
  return { cantidad_actual: nuevaCantidad };
}

export function patchInvProductoStockActual(nuevaCantidad: number): {
  stock_actual: number;
  activo?: boolean;
} {
  const stock_actual = nuevaCantidad <= 0 ? 0 : nuevaCantidad;
  if (stock_actual <= 0) {
    return { stock_actual: 0, activo: false };
  }
  return { stock_actual };
}
