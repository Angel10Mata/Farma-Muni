import { TIPOS_MOVIMIENTO_KARDEX, type TipoMovimientoKardex } from "./zod";

export function etiquetaTipoMovimientoKardex(tipo: string): string {
  return (
    TIPOS_MOVIMIENTO_KARDEX.find((t) => t.value === tipo)?.label ?? tipo
  );
}

export function referenciaKardexTexto(
  referenciaTipo: string | null | undefined,
  referenciaId: string | null | undefined,
  motivo: string | null | undefined,
): string {
  const partes: string[] = [];
  if (motivo?.trim()) partes.push(motivo.trim());
  if (referenciaTipo?.trim()) {
    const ref = referenciaId
      ? `${referenciaTipo} (${referenciaId.slice(0, 8)}…)`
      : referenciaTipo;
    partes.push(ref);
  }
  return partes.join(" · ") || "—";
}

export function esEntradaKardex(cantidad: number): boolean {
  return cantidad > 0;
}

export function cantidadEntradaSalidaKardex(cantidad: number): {
  entrada: number | null;
  salida: number | null;
} {
  if (cantidad > 0) return { entrada: cantidad, salida: null };
  if (cantidad < 0) return { entrada: null, salida: Math.abs(cantidad) };
  return { entrada: null, salida: null };
}

export type FiltrosKardexReporte = {
  productoLabel?: string;
  loteNumero?: string;
  tipo?: TipoMovimientoKardex;
  desde?: string;
  hasta?: string;
};
