import { cn, fmtQ } from "@/lib/utils";
import { formatFechaRecibo, formatMonedaRecibo, obtenerCodigoRecibo } from "./lib/helpers";

export interface ReciboVentaItem {
  cantidad: number;
  nombre: string;
  descripcion?: string | null;
  subtotal: number;
}

export interface ReciboVentaProps {
  codigo: string;
  fecha: string;
  cliente: string;
  nit: string;
  formaPago: string;
  items: ReciboVentaItem[];
  total: number;
  observaciones?: string | null;
  className?: string;
  id?: string;
}

export function ReciboVenta({
  codigo,
  fecha,
  cliente,
  nit,
  formaPago,
  items,
  total,
  observaciones,
  className,
  id,
}: ReciboVentaProps) {
  return (
    <div
      id={id}
      className={cn(
        "recibo-venta w-full max-w-[300px] mx-auto bg-white text-black font-sans p-4 rounded-xl shadow-xs text-left box-border flex flex-col select-none",
        className
      )}
    >
      {/* Encabezado con Logo, Nombre y Dirección */}
      <div className="text-center pb-2 border-b border-black/30 mb-2">
        <img
          src="/farmamuni/logo.png"
          alt="Logo FarmaMuni"
          className="size-12 mx-auto object-contain mb-1"
        />
        <h1 className="text-sm font-black tracking-tight text-black uppercase leading-tight">
          FarmaMuni
        </h1>
        <p className="text-[9.5px] font-bold text-black leading-tight mt-0.5 max-w-[240px] mx-auto">
          3 CALLE 11-090, Zona 1, CHIQUIMULA, CHIQUIMULA
        </p>
        <p className="text-[9px] font-bold text-black/80 mt-0.5">Guatemala</p>
      </div>

      {/* Detalles del Recibo */}
      <div className="text-[11px] space-y-0.5 pb-2 border-b border-black/30 mb-2">
        <p className="font-bold text-black text-xs tracking-wide">
          RECIBO DE VENTA #{codigo}
        </p>
        <div className="grid grid-cols-2 gap-x-2 text-[10px] text-black pt-0.5">
          <p><span className="font-bold text-black">Fecha:</span> <span className="font-medium">{fecha}</span></p>
          <p><span className="font-bold text-black">Pago:</span> <span className="font-medium">{formaPago}</span></p>
          <p className="col-span-2 truncate"><span className="font-bold text-black">Cliente:</span> <span className="font-medium">{cliente}</span></p>
          <p><span className="font-bold text-black">NIT:</span> <span className="font-medium">{nit}</span></p>
        </div>
      </div>

      {/* Cabecera de Tabla */}
      <div className="grid grid-cols-[28px_1fr_55px_58px] gap-1 text-[9px] font-bold uppercase text-black border-b border-black/30 pb-0.5 mb-1">
        <span>Cant</span>
        <span>Detalle</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Sub</span>
      </div>

      {/* Filas de Productos */}
      <div className="flex flex-col divide-y divide-black/10 text-[10.5px] pb-2 mb-2 border-b border-black/30">
        {items.map((item, idx) => {
          const unitPrice = item.cantidad > 0 ? item.subtotal / item.cantidad : 0;
          return (
            <div key={idx} className="grid grid-cols-[28px_1fr_55px_58px] gap-1 py-1 items-start">
              <span className="font-bold text-black">{item.cantidad}</span>
              <div className="min-w-0 pr-1">
                <p className="font-bold text-black leading-tight break-words">{item.nombre}</p>
                {item.descripcion && (
                  <p className="text-[9px] text-black/80 font-medium font-mono truncate">{item.descripcion}</p>
                )}
              </div>
              <span className="text-right font-medium text-black">{fmtQ(unitPrice)}</span>
              <span className="text-right font-bold text-black">{fmtQ(item.subtotal)}</span>
            </div>
          );
        })}
      </div>

      {/* Total a Pagar */}
      <div className="text-right mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-black">Total a pagar</p>
        <p className="text-xl font-black text-black tracking-tight mt-0.5">
          {formatMonedaRecibo(total)}
        </p>
      </div>

      {observaciones && (
        <p className="text-[9.5px] italic text-black font-medium mb-2 text-left">
          <span className="font-bold not-italic">Notas:</span> {observaciones}
        </p>
      )}

      {/* Pie de página */}
      <div className="text-center pt-1 mt-2">
        <p className="text-[10.5px] font-bold text-black">¡Gracias por su compra!</p>
        <div className="mt-2 text-[8px] text-black/60 border-t border-dashed border-black/40 pt-1">
          - - - - - - - - - - - - - - - - - - - - - - - - - -
        </div>
      </div>
    </div>
  );
}

export function mapDetallesToReciboItems(detalles: any[]): ReciboVentaItem[] {
  return detalles.map((d) => ({
    cantidad: d.cantidad,
    nombre: d.inv_productos?.nombre || "Producto",
    descripcion: d.inv_productos?.codigo
      ? `${d.inv_productos.codigo}${d.precio_aplicado ? ` · ${fmtQ(d.precio_aplicado)} c/u` : ""}`
      : d.precio_aplicado
        ? `${fmtQ(d.precio_aplicado)} c/u`
        : null,
    subtotal: d.subtotal,
  }));
}

export function buildReciboProps(
  venta: any,
  detalles: any[],
  clienteCompleto?: any,
) {
  return {
    codigo: obtenerCodigoRecibo(venta.id),
    fecha: formatFechaRecibo(venta.created_at),
    cliente:
      clienteCompleto?.nombre || venta.ven_clientes?.nombre || "Consumidor final",
    nit: clienteCompleto?.nit || venta.ven_clientes?.nit || "C/F",
    formaPago: venta.tipo_venta || "Contado",
    items: mapDetallesToReciboItems(detalles),
    total: venta.total,
    observaciones: venta.observaciones,
  };
}
