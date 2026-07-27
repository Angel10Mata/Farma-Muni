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
        "recibo-venta w-full max-w-[340px] mx-auto bg-white text-slate-900 font-sans p-6 rounded-2xl shadow-sm border border-slate-200 text-left box-border flex flex-col select-none",
        className
      )}
    >
      {/* Encabezado con Logo, Nombre y Dirección */}
      <div className="text-center pb-3 border-b border-slate-200 mb-3">
        <img
          src="/farmacia-la-salud/logo.png"
          alt="Logo Farmacia La Salud"
          className="size-16 mx-auto object-contain mb-1.5"
        />
        <h1 className="text-base font-black tracking-tight text-[#525D53] uppercase">
          FARMACIA SALUD
        </h1>
        <p className="text-[10px] font-bold text-slate-600 leading-snug mt-0.5 max-w-[260px] mx-auto">
          3 CALLE 11-090, Zona 1, CHIQUIMULA, CHIQUIMULA
        </p>
        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Guatemala</p>
      </div>

      {/* Detalles del Recibo */}
      <div className="text-xs space-y-1 pb-3 border-b border-slate-200 mb-3">
        <p className="font-black text-[#525D53] text-sm tracking-wide">
          RECIBO DE VENTA #{codigo}
        </p>
        <div className="grid grid-cols-2 gap-x-2 text-[11px] text-slate-600 pt-1">
          <p><span className="font-bold text-slate-700">Fecha:</span> {fecha}</p>
          <p><span className="font-bold text-slate-700">Pago:</span> {formaPago}</p>
          <p className="col-span-2 truncate"><span className="font-bold text-slate-700">Cliente:</span> {cliente}</p>
          <p><span className="font-bold text-slate-700">NIT:</span> {nit}</p>
        </div>
      </div>

      {/* Cabecera de Tabla */}
      <div className="grid grid-cols-[32px_1fr_60px_65px] gap-1 text-[10px] font-black uppercase text-[#525D53] border-b border-slate-200 pb-1 mb-2">
        <span>Cant</span>
        <span>Detalle</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Sub</span>
      </div>

      {/* Filas de Productos */}
      <div className="flex flex-col divide-y divide-slate-100 text-xs pb-3 mb-3 border-b border-slate-200">
        {items.map((item, idx) => {
          const unitPrice = item.cantidad > 0 ? item.subtotal / item.cantidad : 0;
          return (
            <div key={idx} className="grid grid-cols-[32px_1fr_60px_65px] gap-1 py-1.5 items-start">
              <span className="font-bold text-slate-800">{item.cantidad}</span>
              <div className="min-w-0 pr-1">
                <p className="font-bold text-slate-900 leading-tight break-words">{item.nombre}</p>
                {item.descripcion && (
                  <p className="text-[10px] text-slate-400 font-mono truncate">{item.descripcion}</p>
                )}
              </div>
              <span className="text-right font-medium text-slate-600">{fmtQ(unitPrice)}</span>
              <span className="text-right font-bold text-slate-900">{fmtQ(item.subtotal)}</span>
            </div>
          );
        })}
      </div>

      {/* Total a Pagar */}
      <div className="text-right mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total a pagar</p>
        <p className="text-xl font-black text-[#525D53] tracking-tight mt-0.5">
          {formatMonedaRecibo(total)}
        </p>
      </div>

      {observaciones && (
        <p className="text-[10px] italic text-slate-500 mb-3 text-left">
          <span className="font-bold not-italic">Notas:</span> {observaciones}
        </p>
      )}

      {/* Pie de página */}
      <div className="text-center pt-2 mt-auto">
        <p className="text-xs font-bold text-slate-500">¡Gracias por su compra!</p>
        <div className="mt-3 text-[9px] text-slate-300 border-t border-dashed border-slate-300 pt-1">
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
