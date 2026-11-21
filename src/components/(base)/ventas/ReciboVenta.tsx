import { APP_LOGO_PATH } from "@/lib/app-config";
import { cn, fmtQ } from "@/lib/utils";
import { etiquetaLaboratorioComercial } from "@/components/(base)/inventario/lib/helpers";
import {
  agruparLineasCarritoVenta,
  codigoReciboVenta,
  formatFechaRecibo,
  formatMonedaRecibo,
} from "./lib/helpers";
import type { ItemCarrito } from "./lib/zod";

// Datos del comprobante
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
  farmaciaNombre?: string;
  farmaciaDireccion?: string;
  farmaciaTelefono?: string;
  incluyeReceta?: boolean;
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
  farmaciaNombre = "FarmaMuni",
  farmaciaDireccion = "3 CALLE 11-090, Zona 1, CHIQUIMULA, CHIQUIMULA",
  farmaciaTelefono,
  incluyeReceta,
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
          src={APP_LOGO_PATH}
          alt="Logo FarmaMuni"
          className="size-12 mx-auto object-contain mb-1"
        />
        <h1 className="text-sm font-bold tracking-tight text-black uppercase leading-tight">
          {farmaciaNombre}
        </h1>
        <p className="text-[9.5px] font-bold text-black leading-tight mt-0.5 max-w-[240px] mx-auto">
          {farmaciaDireccion}
        </p>
        {farmaciaTelefono ? (
          <p className="text-[9px] font-bold text-black mt-0.5">Tel. {farmaciaTelefono}</p>
        ) : (
          <p className="text-[9px] font-bold text-black mt-0.5">Guatemala</p>
        )}
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
                  <p className="text-[9px] text-black font-medium font-mono truncate">{item.descripcion}</p>
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

      {incluyeReceta && (
        <p className="text-[9.5px] font-bold text-black mb-2 text-center">
          Incluye medicamento con receta
        </p>
      )}

      {observaciones && (
        <p className="text-[9.5px] italic text-black font-medium mb-2 text-left">
          <span className="font-bold not-italic">Notas:</span> {observaciones}
        </p>
      )}

      {/* Pie de página */}
      <div className="text-center pt-1 mt-2">
        <p className="text-[10.5px] font-bold text-black">¡Gracias por su compra!</p>
        <div className="mt-2 text-[8px] text-black border-t border-dashed border-black/40 pt-1">
          - - - - - - - - - - - - - - - - - - - - - - - - - -
        </div>
      </div>
    </div>
  );
}

// Armar recibo desde una venta
function lineaGenericoDesdeDetalle(d: Record<string, unknown>): string {
  const prod = d.inv_productos as Record<string, unknown> | null | undefined;
  const genRaw = prod?.inv_genericos;
  const gen = Array.isArray(genRaw) ? genRaw[0] : genRaw;
  const genObj = gen as Record<string, unknown> | null | undefined;
  const catRaw = genObj?.inv_catalogos;
  const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
  const catalogo = (cat as { nombre?: string } | null)?.nombre?.trim();
  const conc = String(genObj?.concentracion ?? "").trim();
  const forma = String(genObj?.forma_farmaceutica ?? "").trim();
  const partes = [catalogo, conc, forma].filter(Boolean);
  if (partes.length > 0) return partes.join(" ");
  return String(prod?.nombre ?? "Producto");
}

function lineaComercialReciboClienteDesdeDetalle(d: Record<string, unknown>): string {
  const prod = d.inv_productos as Record<string, unknown> | null | undefined;
  const labRaw = prod?.inv_laboratorios;
  const lab = Array.isArray(labRaw) ? labRaw[0] : labRaw;
  const marca = String(prod?.nombre ?? "").trim();
  const labNombre = (lab as { nombre?: string } | null)?.nombre?.trim() ?? "";
  const presentacion = String(prod?.presentacion ?? "").trim();
  const trozos = [
    marca ? `Marca: ${marca}` : "",
    labNombre ? `Lab: ${etiquetaLaboratorioComercial(labNombre)}` : "",
    presentacion ? `Pres: ${presentacion}` : "",
  ].filter(Boolean);
  return trozos.join(" · ");
}

function descripcionComercialReciboCliente(
  nombreComercial: string,
  laboratorioNombre: string | null,
  presentacion: string,
): string {
  return [
    nombreComercial ? `Marca: ${nombreComercial}` : "",
    laboratorioNombre
      ? `Lab: ${etiquetaLaboratorioComercial(laboratorioNombre)}`
      : "",
    presentacion ? `Pres: ${presentacion}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function nombreGenericoReciboDesdeCarrito(item: ItemCarrito): string {
  const nombre = `${item.generico.generico_nombre}`.trim();
  if (nombre) return nombre;
  return `${item.generico.concentracion} ${item.generico.forma_farmaceutica}`.trim();
}

function productoIdDesdeDetalle(row: Record<string, unknown>): string {
  const prod = row.inv_productos as Record<string, unknown> | null | undefined;
  const id = prod?.id;
  if (id != null && String(id).trim()) return String(id);
  const lote = row.inv_lotes as Record<string, unknown> | null | undefined;
  const loteProd = lote?.producto_id;
  if (loteProd != null && String(loteProd).trim()) return String(loteProd);
  return "";
}

export function esDetalleVentaDb(linea: unknown): boolean {
  const row = linea as Record<string, unknown>;
  return Boolean(row.inv_productos ?? row.inv_lotes);
}

export function lineasReciboDesdeEntrada(detalles: unknown[]): ReciboVentaItem[] {
  if (detalles.length === 0) return [];
  if (esDetalleVentaDb(detalles[0])) return mapDetallesToReciboItems(detalles);
  return detalles as ReciboVentaItem[];
}

export function mapDetallesToReciboItems(detalles: unknown[]): ReciboVentaItem[] {
  const orden: ReciboVentaItem[] = [];
  const porProducto = new Map<string, ReciboVentaItem>();

  for (const d of detalles) {
    const row = d as Record<string, unknown>;
    const productoId = productoIdDesdeDetalle(row);
    const key = productoId || `__linea_${orden.length}`;
    const cantidad = Number(row.cantidad) || 0;
    const subtotal = Number(row.subtotal) || 0;
    const existente = porProducto.get(key);
    if (existente) {
      existente.cantidad += cantidad;
      existente.subtotal += subtotal;
      continue;
    }
    const item: ReciboVentaItem = {
      cantidad,
      nombre: lineaGenericoDesdeDetalle(row),
      descripcion: lineaComercialReciboClienteDesdeDetalle(row),
      subtotal,
    };
    porProducto.set(key, item);
    orden.push(item);
  }

  return orden;
}

export function mapCarritoToReciboItems(carrito: ItemCarrito[]): ReciboVentaItem[] {
  return agruparLineasCarritoVenta(carrito).map((grupo) => {
    const item = grupo.item;
    return {
      cantidad: grupo.cantidadTotal,
      nombre: nombreGenericoReciboDesdeCarrito(item),
      descripcion: descripcionComercialReciboCliente(
        item.comercial.nombre_comercial,
        item.comercial.laboratorio_nombre,
        item.comercial.presentacion,
      ),
      subtotal: grupo.subtotalTotal,
    };
  });
}

export function buildReciboProps(
  venta: any,
  detalles: any[],
  clienteCompleto?: any,
  extras?: {
    farmacia?: { nombre: string; direccion: string; telefono: string } | null;
    incluyeReceta?: boolean;
    items?: ReciboVentaItem[];
  },
) {
  return {
    codigo: codigoReciboVenta(venta),
    farmaciaNombre: extras?.farmacia?.nombre,
    farmaciaDireccion: extras?.farmacia?.direccion,
    farmaciaTelefono: extras?.farmacia?.telefono,
    incluyeReceta: extras?.incluyeReceta,
    fecha: formatFechaRecibo(venta.created_at),
    cliente:
      clienteCompleto?.nombre || venta.ven_clientes?.nombre || "Consumidor final",
    nit: clienteCompleto?.nit || venta.ven_clientes?.nit || "C/F",
    formaPago: venta.tipo_venta || "Contado",
    items: extras?.items ?? mapDetallesToReciboItems(detalles),
    total: venta.total,
    observaciones: venta.observaciones,
  };
}
