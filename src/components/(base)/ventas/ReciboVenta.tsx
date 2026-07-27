import { cn, fmtQ } from "@/lib/utils";
import { formatFechaRecibo, formatMonedaRecibo, obtenerCodigoRecibo } from "./recibo-utils";

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
        "recibo-venta w-full max-w-[340px] mx-auto bg-white text-black font-sans p-6 rounded-2xl shadow-sm border border-slate-300 text-left box-border flex flex-col select-none",
        className
      )}
    >
      {/* Encabezado con Logo, Nombre y Dirección */}
      <div className="text-center pb-3 border-b border-black/40 mb-3">
        <img
          src="/farmacia-la-salud/logo.png"
          alt="Logo Farmacia Salud"
          className="size-16 mx-auto object-contain mb-1.5"
        />
        <h1 className="text-base font-black tracking-tight text-black uppercase">
          FARMACIA SALUD
        </h1>
        <p className="text-[10.5px] font-extrabold text-black leading-snug mt-0.5 max-w-[260px] mx-auto">
          3 CALLE 11-090, Zona 1, CHIQUIMULA, CHIQUIMULA
        </p>
        <p className="text-[10px] font-bold text-black/80 mt-0.5">Guatemala</p>
      </div>

      {/* Detalles del Recibo */}
      <div className="text-xs space-y-1 pb-3 border-b border-black/40 mb-3">
        <p className="font-black text-black text-sm tracking-wide">
          RECIBO DE VENTA #{codigo}
        </p>
        <div className="grid grid-cols-2 gap-x-2 text-[11px] text-black pt-1">
          <p><span className="font-extrabold text-black">Fecha:</span> <span className="font-bold">{fecha}</span></p>
          <p><span className="font-extrabold text-black">Pago:</span> <span className="font-bold">{formaPago}</span></p>
          <p className="col-span-2 truncate"><span className="font-extrabold text-black">Cliente:</span> <span className="font-bold">{cliente}</span></p>
          <p><span className="font-extrabold text-black">NIT:</span> <span className="font-bold">{nit}</span></p>
        </div>
      </div>

      {/* Cabecera de Tabla */}
      <div className="grid grid-cols-[32px_1fr_60px_65px] gap-1 text-[10px] font-black uppercase text-black border-b border-black/40 pb-1 mb-2">
        <span>Cant</span>
        <span>Detalle</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Sub</span>
      </div>

      {/* Filas de Productos */}
      <div className="flex flex-col divide-y divide-black/15 text-xs pb-3 mb-3 border-b border-black/40">
        {items.map((item, idx) => {
          const unitPrice = item.cantidad > 0 ? item.subtotal / item.cantidad : 0;
          return (
            <div key={idx} className="grid grid-cols-[32px_1fr_60px_65px] gap-1 py-1.5 items-start">
              <span className="font-extrabold text-black">{item.cantidad}</span>
              <div className="min-w-0 pr-1">
                <p className="font-black text-black leading-tight break-words">{item.nombre}</p>
                {item.descripcion && (
                  <p className="text-[10px] text-black font-bold font-mono truncate">{item.descripcion}</p>
                )}
              </div>
              <span className="text-right font-bold text-black">{fmtQ(unitPrice)}</span>
              <span className="text-right font-black text-black">{fmtQ(item.subtotal)}</span>
            </div>
          );
        })}
      </div>

      {/* Total a Pagar */}
      <div className="text-right mb-3">
        <p className="text-xs font-black uppercase tracking-wider text-black">Total a pagar</p>
        <p className="text-2xl font-black text-black tracking-tight mt-0.5">
          {formatMonedaRecibo(total)}
        </p>
      </div>

      {observaciones && (
        <p className="text-[10px] italic text-black font-bold mb-3 text-left">
          <span className="font-black not-italic">Notas:</span> {observaciones}
        </p>
      )}

      {/* Pie de página */}
      <div className="text-center pt-2 mt-auto">
        <p className="text-xs font-black text-black">¡Gracias por su compra!</p>
        <div className="mt-3 text-[9px] text-black/60 border-t border-dashed border-black/60 pt-1">
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
