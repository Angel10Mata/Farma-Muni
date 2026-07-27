"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Receipt, FileDown, Check, Package, X, AlertTriangle, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtQ } from "@/lib/utils";
import { CrearCliente } from "@/components/(base)/clientes/forms/CrearCliente";
import {
  obtenerProductosYClientes,
  obtenerHistorialVentas,
  obtenerDetalleVenta,
  anularVenta,
  editarDetalleVentaDirecto,
  eliminarDetalleVentaDirecto,
  validarCredencialesAdmin
} from "./lib/actions";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import { ReciboVenta, buildReciboProps } from "./ReciboVenta";
import { obtenerCodigoRecibo } from "./recibo-utils";
import { HistorialVentas } from "./HistorialVentas";
import { usePOSData } from "./lib/hooks";

import { Producto, Cliente, Venta, ItemCarrito } from "./types";
import { usePOS, POSProvider } from "./POSContext";
import { POSProductSection } from "./POSProductSection";
import { POSCartSidebar } from "./POSCartSidebar";
import Swal from "sweetalert2";
import { getSwalThemeOpts } from "@/lib/utils";

function VerVentasInner({ productos, clientes, refetchDatos }: { productos: Producto[], clientes: Cliente[], refetchDatos: () => void }) {
  const { effectiveRole } = useUserContext();
  const pos = usePOS();
  
  const reciboCaptureRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDetalle, setIsSavingDetalle] = useState(false);

  // For Editing Detalle Venta from Historial
  const [ventaDetalleSeleccionada, setVentaDetalleSeleccionada] = useState<any>(null);
  const [detallesDeVenta, setDetallesDeVenta] = useState<any[]>([]);
  const [editingDetalleId, setEditingDetalleId] = useState<string | null>(null);
  const [editingDetalleQty, setEditingDetalleQty] = useState<number>(0);
  const [editingDetallePrice, setEditingDetallePrice] = useState<number>(0);

  const promptAdminCredentials = async () => {
    const result = await Swal.fire({
      title: "Autorización Requerida",
      html: `
        <input id="swal-admin-user" class="swal2-input" style="width: 80%;" placeholder="Usuario" autocomplete="off" />
        <input id="swal-admin-pass" class="swal2-input" style="width: 80%;" type="password" placeholder="Contraseña" autocomplete="off" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Autorizar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts(),
      preConfirm: () => {
        const user = (document.getElementById("swal-admin-user") as HTMLInputElement).value;
        const pass = (document.getElementById("swal-admin-pass") as HTMLInputElement).value;
        if (!user || !pass) {
          Swal.showValidationMessage("Ambos campos son obligatorios");
        }
        return { username: user, password: pass };
      }
    });

    if (!result.isConfirmed) return false;

    Swal.fire({
      title: "Verificando...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      ...getSwalThemeOpts()
    });

    const res = await validarCredencialesAdmin(result.value.username, result.value.password);
    
    if (!res.success) {
      await Swal.fire({
        title: "Denegado",
        text: res.error,
        icon: "error",
        ...getSwalThemeOpts()
      });
      return false;
    }
    
    return true;
  };

  const handleAnularVenta = async (ventaId: string) => {
    const resConfirm = await Swal.fire({
      title: "¿Anular esta venta?",
      text: "Esta acción devolverá los productos vendidos al inventario y eliminará el registro de venta.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, anular",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts(),
      confirmButtonColor: "#ef4444"
    });

    if (!resConfirm.isConfirmed) return;

    if (effectiveRole === "user") {
      const authorized = await promptAdminCredentials();
      if (!authorized) return;
    }

    setIsLoading(true);
    try {
      const res = await anularVenta(ventaId);
      if (!res.success) throw new Error(res.error);

      Swal.fire({
        title: "¡Anulada!",
        text: "La venta ha sido anulada exitosamente y el stock ha sido restablecido.",
        icon: "success",
        ...getSwalThemeOpts()
      });

      refetchDatos();
    } catch (err: any) {
      Swal.fire({
        title: "Error al anular",
        text: err.message || "No se pudo anular la venta.",
        icon: "error",
        ...getSwalThemeOpts(),
        confirmButtonColor: "#ef4444"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarVenta = async (venta: Venta) => {
    if (pos.carrito.length > 0) {
      const confirmOverwrite = await Swal.fire({
        title: "Carrito con productos",
        text: "Tienes productos en el Punto de Venta actual. Editar esta venta los reemplazará.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, reemplazar",
        cancelButtonText: "Cancelar",
        ...getSwalThemeOpts()
      });
      if (!confirmOverwrite.isConfirmed) return;
    }

    const resConfirm = await Swal.fire({
      title: "¿Editar esta venta?",
      text: "Esto anulará la venta original y cargará los productos en el POS para modificarlos.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, editar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts()
    });

    if (!resConfirm.isConfirmed) return;

    setIsLoading(true);
    try {
      const detalles = await obtenerDetalleVenta(venta.id);
      if (!detalles || detalles.length === 0) throw new Error("No se pudieron cargar los detalles.");

      const resAnulacion = await anularVenta(venta.id);
      if (!resAnulacion.success) throw new Error(resAnulacion.error);

      const dataMaster = await obtenerProductosYClientes();
      const nuevosProductos: Producto[] = dataMaster.productos as Producto[];
      
      const nuevosItemsCarrito: ItemCarrito[] = detalles.map((d: any) => {
        const prodEncontrado = nuevosProductos.find(p => p.id === d.producto_id);
        return {
          producto: prodEncontrado || {
            id: d.producto_id,
            codigo: d.inv_productos?.codigo || "",
            nombre: d.inv_productos?.nombre || "Producto",
            descripcion: "",
            precio_base: d.precio_aplicado,
            stock_actual: d.cantidad,
            stock_minimo: 0,
            activo: true
          },
          cantidad: d.cantidad,
          precio_aplicado: d.precio_aplicado,
          subtotal: d.subtotal
        };
      });

      pos.setCarrito(nuevosItemsCarrito);
      
      if (venta.cliente_id) {
        const cliente = dataMaster.clientes.find((c: any) => c.id === venta.cliente_id);
        if (cliente) {
          pos.setClienteSeleccionado(cliente as Cliente);
          pos.setClienteBusqueda(cliente.nombre);
        }
      } else {
        pos.setClienteSeleccionado(null);
        pos.setClienteBusqueda("Consumidor Final");
      }

      pos.setTipoVenta(venta.tipo_venta === "Crédito" ? "Crédito" : "Contado");
      pos.setObservaciones(venta.observaciones || "");
      pos.setActiveTab("pos");

      Swal.fire({
        title: "Venta cargada",
        text: "La venta ha sido cargada. Finaliza el cobro para guardar los cambios.",
        icon: "success",
        ...getSwalThemeOpts()
      });

    } catch (err: any) {
      Swal.fire({
        title: "Error al editar",
        text: err.message || "No se pudo cargar la venta para edición.",
        icon: "error",
        ...getSwalThemeOpts()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const exportarFacturaPDF = async (venta: Venta, detalles: any[]) => {
    try {
      const doc = new jsPDF({ unit: "mm", format: [80, 175] });
      const clientName = venta.ven_clientes?.nombre || "Consumidor Final";
      const clientNit = venta.ven_clientes?.nit || "C/F";
      const dateFormatted = new Date(venta.created_at).toLocaleString("es-GT", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
      });

      let currentY = 6;

      // Cargar e insertar Logo
      const logoBase64 = await getBase64ImageFromUrl("/farmacia-la-salud/logo.png");
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 33, currentY, 14, 14);
        currentY += 17;
      } else {
        currentY += 4;
      }

      // Nombre de la Farmacia
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("FARMACIA SALUD", 40, currentY, { align: "center" });
      currentY += 4;

      // Dirección
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      doc.text("3 CALLE 11-090, Zona 1, CHIQUIMULA, CHIQUIMULA", 40, currentY, { align: "center" });
      currentY += 3.5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text("Guatemala", 40, currentY, { align: "center" });
      currentY += 3.5;

      doc.setDrawColor(0, 0, 0);
      doc.line(5, currentY, 75, currentY);
      currentY += 5;

      const codigoRecibo = obtenerCodigoRecibo(venta.id);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`RECIBO DE VENTA #${codigoRecibo}`, 5, currentY);
      currentY += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`Fecha: ${dateFormatted}`, 5, currentY); currentY += 4.5;
      doc.text(`Cliente: ${clientName}`, 5, currentY); currentY += 4.5;
      doc.text(`NIT: ${clientNit}`, 5, currentY); currentY += 4.5;
      doc.text(`Pago: ${venta.tipo_venta || "Contado"}`, 5, currentY); currentY += 3;

      doc.setDrawColor(0, 0, 0);
      doc.line(5, currentY, 75, currentY);
      currentY += 2;

      autoTable(doc, {
        startY: currentY,
        head: [["Cant", "Detalle", "Precio", "Sub"]],
        body: detalles.map((d) => [
          d.cantidad,
          d.inv_productos?.nombre || "Pedido",
          `${fmtQ(d.precio_aplicado)}`,
          `${fmtQ(d.subtotal)}`
        ]),
        theme: "plain",
        styles: { fontSize: 7, cellPadding: 1, valign: "middle", textColor: [0, 0, 0], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 12, halign: "right" }, 3: { cellWidth: 15, halign: "right" }
        },
        headStyles: { fontStyle: "bold", fillColor: [230, 230, 230], textColor: [0, 0, 0] },
        margin: { left: 4, right: 4 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 4;
      doc.setDrawColor(0, 0, 0);
      doc.line(5, finalY, 75, finalY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`TOTAL A PAGAR: ${fmtQ(venta.total)}`, 75, finalY + 5, { align: "right" });

      let endY = finalY + 11;
      if (venta.observaciones) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        doc.text(`Notas: ${venta.observaciones}`, 5, endY);
        endY += 6;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text("¡Gracias por su compra!", 40, endY, { align: "center" });

      doc.save(`Recibo_FarmaciaSalud_${codigoRecibo}.pdf`);
    } catch (error) {
      console.error("Error al exportar PDF:", error);
    }
  };

  const shareWhatsAppAsImage = async (venta: any, detalles: any[], clienteCompleto?: any) => {
    try {
      const code = obtenerCodigoRecibo(venta.id);
      const clientName = clienteCompleto?.nombre || venta.ven_clientes?.nombre || "Consumidor final";

      let productListText = "";
      detalles.forEach(d => {
        const nombreProducto = d.producto?.nombre || d.ven_productos?.nombre || "Producto desconocido";
        productListText += "* " + d.cantidad + "x - " + nombreProducto + " - " + fmtQ(d.subtotal || 0) + "\n";
      });

      const emojiData = await fetch("data:application/json;base64,eyJ3YXZlIjoi8J+RiyIsImhvc3BpdGFsIjoi8J+PpSIsInJlY2VpcHQiOiLwn6e+IiwicGVyc29uIjoi8J+RpCIsImNhcnQiOiLwn5uSIiwibW9uZXkiOiLwn5KwIiwic3BhcmtsZSI6IuKcqCIsInNlZWRsaW5nIjoi8J+MsSIsImdyZWVuIjoi8J+SmiJ9").then(r => r.json());

      const message =
        String.fromCharCode(0xA1) + "Hola! " + emojiData.wave + "\n" +
        "Te comparto el comprobante digital de tu compra:\n\n" +
        emojiData.hospital + " FARMACIA SALUD\n" +
        "📍 3 CALLE 11-090, Zona 1, CHIQUIMULA, CHIQUIMULA\n\n" +
        emojiData.receipt + " Recibo de Venta: #" + code + "\n" +
        emojiData.person + " Cliente: " + clientName + "\n\n" +
        emojiData.cart + " Detalle de compra :\n" +
        productListText.trimEnd() + "\n\n" +
        emojiData.money + " Total: " + fmtQ(venta.total) + "\n\n" +
        emojiData.sparkle + " " + String.fromCharCode(0xA1) + "GRACIAS POR TU COMPRA! " + emojiData.sparkle + "\n\n" +
        " " + emojiData.seedling + emojiData.green + " FARMACIA SALUD\n" +
        " Cuidando siempre de tu salud y bienestar\n";

      const encodedMsg = encodeURIComponent(message);
      window.open("https://api.whatsapp.com/send/?text=" + encodedMsg, "_blank");
    } catch (error) {
      console.error("Error al generar WhatsApp:", error);
    }
  };

  useEffect(() => {
    if (pos.ticketParaImprimir) {
      const timer = setTimeout(() => {
        window.print();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pos.ticketParaImprimir]);

  const handleImprimirVenta = async (venta: Venta, detalles?: any[]) => {
    try {
      setIsLoading(true);
      let details = detalles;
      if (!details || details.length === 0) {
        details = await obtenerDetalleVenta(venta.id);
      }
      pos.setTicketParaImprimir({
        venta,
        detalles: details,
        clienteCompleto: venta.ven_clientes,
      });
    } catch (err) {
      console.error("Error al preparar impresión de recibo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareWhatsAppDirectly = async (venta: Venta) => {
    try {
      const details = await obtenerDetalleVenta(venta.id);
      await shareWhatsAppAsImage(venta, details);
    } catch (err) {
      console.error("Error al compartir WhatsApp:", err);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-6 pt-32 md:pt-24 min-h-screen">
      <CrearCliente
        isOpen={pos.isCrearClienteOpen}
        onClose={() => pos.setIsCrearClienteOpen(false)}
        onSuccess={refetchDatos}
      />

      {/* Modal Ubicaciones */}
      <AnimatePresence>
        {pos.showUbicacionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#8DA78E] dark:bg-[#A3BEB0] p-6 text-center relative shrink-0">
                <button
                  onClick={() => pos.setShowUbicacionModal(false)}
                  className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-6" />
                </button>
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-sm">
                  <Package className="size-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#F5F5F1] tracking-tight">Recolección de Productos</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-zinc-950/50">
                <div className="flex flex-col gap-3">
                  {pos.carrito.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-900 dark:text-white text-lg">
                          {item.cantidad}x {item.producto.nombre}
                        </span>
                        {(!item.producto.ubicacion || item.producto.ubicacion === 'Sin asignar') ? (
                          <div className="flex items-center gap-1.5 text-amber-500 font-bold bg-amber-50 dark:bg-amber-500/10 w-fit px-2.5 py-1 rounded-md">
                            <AlertTriangle className="size-4" />
                            <span className="text-sm">Sin ubicación asignada</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[#8DA78E] font-bold bg-[#8DA78E]/10 w-fit px-2.5 py-1 rounded-md">
                            <Package className="size-4" />
                            <span className="text-sm">{item.producto.ubicacion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                <button
                  onClick={() => pos.setShowUbicacionModal(false)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  onClick={pos.ejecutarCobro}
                  disabled={pos.isProcesandoVenta}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#8DA78E] text-white font-black hover:bg-[#7a937b] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {pos.isProcesandoVenta ? "Procesando..." : <><Check className="size-5" /> Confirmar y Cobrar</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Recibo */}
      <AnimatePresence>
        {pos.reciboModalData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border-0 sm:border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-none sm:rounded-3xl w-full min-h-[75vh] sm:min-h-0 max-h-[96vh] sm:h-auto max-w-lg overflow-hidden shadow-2xl flex flex-col sm:max-h-[90vh]"
            >
              <div className="shrink-0 bg-[#8DA78E] dark:bg-[#525D53] p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider">¡COBRO EXITOSO!</h3>
                  <p className="text-[10px] text-white/80 font-medium">Venta registrada bajo el Recibo #{obtenerCodigoRecibo(pos.reciboModalData.venta.id)}</p>
                </div>
                <div className="size-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Receipt className="size-5 text-white" />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-zinc-100 dark:bg-zinc-950 flex flex-col justify-center items-center p-3 sm:p-6">
                <ReciboVenta
                  {...buildReciboProps(
                    pos.reciboModalData.venta,
                    pos.reciboModalData.detalles,
                    pos.reciboModalData.clienteCompleto,
                  )}
                />
              </div>

              <div className="shrink-0 p-4 sm:p-5 bg-zinc-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    handleImprimirVenta(pos.reciboModalData.venta, pos.reciboModalData.detalles);
                  }}
                  className="w-fit px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer border border-transparent hover:opacity-90 transition-opacity"
                >
                  <Printer className="size-5" /> Imprimir Ticket
                </button>
                <button
                  onClick={() => exportarFacturaPDF(pos.reciboModalData.venta, pos.reciboModalData.detalles)}
                  className="w-fit px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-red-600 dark:text-red-500 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer border border-transparent hover:opacity-90 transition-opacity"
                >
                  <FileDown className="size-5" /> Descargar PDF
                </button>
                <button
                  onClick={() => shareWhatsAppAsImage(pos.reciboModalData.venta, pos.reciboModalData.detalles, pos.reciboModalData.clienteCompleto)}
                  className="w-fit px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-500 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer border border-transparent hover:opacity-90 transition-opacity"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => pos.setReciboModalData(null)}
                  className="w-fit px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-bold flex items-center justify-center cursor-pointer border border-transparent hover:opacity-90 transition-opacity"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0 size-12 rounded-2xl bg-[#8DA78E]/10 border border-[#8DA78E]/20 flex items-center justify-center">
            <ShoppingCart className="size-6 text-[#8DA78E] dark:text-[#A3BEB0]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">Módulo</p>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
              Área de Ventas
            </h1>
          </div>
        </div>

        <div className="flex bg-[#F5F5F1] dark:bg-[#525D53]/10 border border-[#C1D1C5]/40 dark:border-[#A3BEB0]/10 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => pos.setActiveTab("pos")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              pos.activeTab === "pos" ? "bg-[#8DA78E] text-[#F5F5F1] shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Punto de Venta
          </button>
          <button
            onClick={() => pos.setActiveTab("historial")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              pos.activeTab === "historial" ? "bg-[#8DA78E] text-[#F5F5F1] shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Historial de Ventas
          </button>
        </div>
      </div>

      {pos.activeTab === "pos" ? (
        <div className="flex flex-col lg:flex-row gap-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <POSProductSection productos={productos} clientes={clientes} />
          <POSCartSidebar />
        </div>
      ) : (
        <HistorialVentas
          onPrint={(v, details) => handleImprimirVenta(v, details)}
          onShareWhatsApp={(v) => handleShareWhatsAppDirectly(v)}
        />
      )}

      {pos.ticketParaImprimir && (
        <div id="print-receipt-ticket" className="hidden print:block">
          <ReciboVenta {...buildReciboProps(pos.ticketParaImprimir.venta, pos.ticketParaImprimir.detalles, pos.ticketParaImprimir.clienteCompleto)} className="max-w-none" />
        </div>
      )}

      <AnimatePresence>
        {pos.imagenAmpliadaUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => pos.setImagenAmpliadaUrl(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={pos.imagenAmpliadaUrl}
              alt="Imagen ampliada"
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain bg-white dark:bg-zinc-900"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VerVentas() {
  const { data, isLoading, isError, error, refetch: refetchDatos } = usePOSData();

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-6 p-4 md:p-6 pt-32 md:pt-24 min-h-screen items-center justify-center">
        <div className="size-8 rounded-full border-4 border-slate-200 border-t-[#8DA78E] animate-spin" />
        <p className="text-slate-500 font-mono animate-pulse">Cargando POS...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full flex flex-col gap-6 p-4 md:p-6 pt-32 md:pt-24 min-h-screen items-center justify-center">
        <p className="text-red-500 font-mono bg-red-50 px-4 py-2 rounded-lg border border-red-200">
          Error al cargar datos del POS: {error instanceof Error ? error.message : "Desconocido"}
        </p>
      </div>
    );
  }

  const productos = (data?.productos as Producto[]) || [];
  const clientes = (data?.clientes as Cliente[]) || [];

  return (
    <POSProvider productos={productos} clientes={clientes} refetchDatos={refetchDatos}>
      <VerVentasInner productos={productos} clientes={clientes} refetchDatos={refetchDatos} />
    </POSProvider>
  );
}
