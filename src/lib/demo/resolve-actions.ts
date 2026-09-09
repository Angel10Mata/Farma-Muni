import { DEMO_VENTA_DETALLE } from "@/lib/demo/fixtures";
import { obtenerDetalleVenta } from "@/components/(base)/ventas/lib/actions";

export async function fetchDetalleVenta(ventaId: string, isDemoMode: boolean) {
  if (isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return DEMO_VENTA_DETALLE.filter((d) => d.venta_id === ventaId);
  }
  return obtenerDetalleVenta(ventaId);
}
