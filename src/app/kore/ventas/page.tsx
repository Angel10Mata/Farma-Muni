"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import Ventas from "@/components/ventas/Ventas";
import { Plus, Search, Home, ChevronRight, ShoppingCart, Printer, HeartHandshake, Eye, X, Download } from "lucide-react";
import * as htmlToImage from 'html-to-image'; 
import Swal from 'sweetalert2'; // <--- ESTA ES LA LÍNEA NUEVA

export default function VentasPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  
  const [ticketImprimir, setTicketImprimir] = useState<any>(null);

  const cargarDatos = async () => {
    setCargando(true);
    const supabase = createClient();

    const { data: vData } = await supabase.from("ventas").select("*, clientes(nombre, dpi), productos(nombre, precio)").order("created_at", { ascending: false });
    const { data: cData } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });
    const { data: pData } = await supabase.from("productos").select("*").order("nombre", { ascending: true });

    if (vData) setVentas(vData);
    if (cData) setClientes(cData);
    if (pData) setProductos(pData);

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleFormularioCompletado = () => {
    setMostrarFormulario(false);
    setVentaSeleccionada(null);
    cargarDatos();
  };

  const ventasFiltradas = ventas.filter((v) =>
    (v.clientes?.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.productos?.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.receta_medica || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatearFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-GT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const generarNumeroTicket = (id: string) => {
    if (!id) return "000000";
    const soloNumeros = id.replace(/\D/g, ''); 
    return soloNumeros.substring(0, 6).padStart(6, '0'); 
  };

  const mandarAImpresoraTermica = () => {
    const contenidoTicket = document.getElementById('contenido-ticket-80mm')?.innerHTML;
    if (!contenidoTicket) return;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`
      <html>
        <head>
          <title>Ticket de Farmacia</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              margin: 0; 
              padding: 4mm; 
              font-size: 12px; 
              color: black; 
              background: white; 
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .mt-2 { margin-top: 8px; }
            .mb-2 { margin-bottom: 8px; }
            .text-lg { font-size: 16px; }
            .line { border-top: 1px dashed black; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px;}
            th, td { text-align: left; padding: 2px 0; vertical-align: top;}
            .th-right, .td-right { text-align: right; }
            .td-cant { width: 30px; }
          </style>
        </head>
        <body>
          ${contenidoTicket}
        </body>
      </html>
    `);
    iframe.contentWindow?.document.close();
    iframe.contentWindow?.focus();

    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe); 
    }, 500);
  };

  // ==========================================
  //    MOTOR NUEVO: html-to-image
  // ==========================================
  const descargarTicketImagen = async () => {
    const elemento = document.getElementById('contenido-ticket-80mm');
    if (!elemento) return;

    try {
      // Esta librería sí entiende los colores modernos de Tailwind
      const dataUrl = await htmlToImage.toPng(elemento, {
        backgroundColor: '#ffffff',
        pixelRatio: 2, // Para que la imagen salga en HD
        style: {
          margin: '0', 
        }
      });
      
      const numeroTicket = generarNumeroTicket(ticketImprimir.id);
      
      const enlace = document.createElement("a");
      enlace.href = dataUrl;
      enlace.download = `Ticket_${numeroTicket}.png`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      
    } catch (error) {
      console.error("Error generando imagen:", error);
      Swal.fire('Error', 'No se pudo generar la imagen del ticket.', 'error');
    }
  };

  return (
    <main className="p-8 w-full max-w-7xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200 relative">
      
      <div className="mb-6 w-full">
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-[#1E1E1E]/50 w-fit px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm backdrop-blur-sm">
          <Link href="/kore" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"><Home size={16} /> Panel</Link>
          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
          <span className="text-gray-900 dark:text-gray-100 font-bold flex items-center gap-1.5"><ShoppingCart size={16} className="text-orange-500" /> Dispensación</span>
        </nav>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Control de Dispensación</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Ventas regulares y entregas de ayuda social médica.</p>
        </div>
        <button onClick={() => { setVentaSeleccionada(null); setMostrarFormulario(true); }} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
          <Plus size={20} /> Nueva Entrega
        </button>
      </div>

      {!cargando && ventas.length > 0 && (
        <div className="mb-6 relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
          <input type="text" placeholder="Buscar por paciente, medicina o receta..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 dark:text-gray-100 transition-colors shadow-sm" />
        </div>
      )}

      {cargando ? (
        <p className="text-gray-500 font-bold animate-pulse">Cargando historial de entregas...</p>
      ) : ventas.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 shadow-sm"><p className="text-gray-500 text-lg">No hay transacciones registradas todavía.</p></div>
      ) : ventasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 shadow-sm"><p className="text-gray-500 text-lg">No se encontraron entregas para "{busqueda}".</p></div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-bold">Fecha / Receta</th>
                <th className="p-4 font-bold">Paciente</th>
                <th className="p-4 font-bold">Medicina</th>
                <th className="p-4 font-bold text-center">Tipo</th>
                <th className="p-4 font-bold text-right">Total</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map((v) => {
                const esDonacion = v.tipo_transaccion === 'Donación';

                return (
                  <tr key={v.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{formatearFecha(v.created_at)}</p>
                      {v.receta_medica && <p className="text-xs text-gray-500 font-mono mt-0.5">Ref: {v.receta_medica}</p>}
                    </td>
                    <td className="p-4 font-bold text-gray-900 dark:text-gray-100">{v.clientes?.nombre || 'Desconocido'}</td>
                    <td className="p-4">
                      <p className="font-semibold dark:text-gray-200">{v.productos?.nombre || 'Eliminado'}</p>
                      <p className="text-xs text-gray-500">Cant: {v.cantidad}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${esDonacion ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                        {esDonacion ? <HeartHandshake size={12}/> : <ShoppingCart size={12}/>} {v.tipo_transaccion || 'Venta Normal'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-gray-900 dark:text-white">Q {Number(v.total).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setTicketImprimir(v)} className="text-blue-500 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors border border-transparent dark:bg-blue-500/10 dark:hover:bg-blue-500/20" title="Imprimir o Descargar Ticket">
                          <Printer size={20} />
                        </button>
                        
                        <button onClick={() => { setVentaSeleccionada(v); setMostrarFormulario(true); }} className="text-gray-500 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-colors border border-transparent dark:bg-gray-800 dark:hover:bg-gray-700" title="Ver Detalles o Anular">
                          <Eye size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {mostrarFormulario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 scrollbar-hide">
            <Ventas ventaActual={ventaSeleccionada} clientes={clientes} productos={productos} onCompletado={handleFormularioCompletado} onCancelar={() => { setMostrarFormulario(false); setVentaSeleccionada(null); }} />
          </div>
        </div>
      )}

      {ticketImprimir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl flex flex-col max-h-[95vh] w-full max-w-lg animate-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2"><Printer size={18} /> Vista Previa del Comprobante</h2>
              <button onClick={() => setTicketImprimir(null)} className="bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 bg-gray-100 dark:bg-black/40 overflow-y-auto flex justify-center items-center">
              
              <div 
                id="contenido-ticket-80mm" 
                className="bg-white text-black p-4 w-[300px] shadow-lg font-mono text-[12px] leading-tight"
                style={{ fontFamily: "'Courier New', Courier, monospace" }}
              >
                <div className="text-center mb-3">
                  <h2 className="font-bold text-[14px]">MUNICIPALIDAD DE</h2>
                  <h2 className="font-bold text-[14px]">CONCEPCIÓN LAS MINAS</h2>
                  <div className="mt-1">Farma-Muni Control</div>
                  <div className="border-t border-dashed border-black mt-2 mb-2"></div>
                  <div className="font-bold">COMPROBANTE DE FARMACIA</div>
                  <div className="border-t border-dashed border-black mt-2 mb-2"></div>
                </div>

                <div className="mb-3">
                  <div>Fecha: {formatearFecha(ticketImprimir.created_at)}</div>
                  <div>Ticket: #{generarNumeroTicket(ticketImprimir.id)}</div>
                  <div className="mt-1">Paciente: {ticketImprimir.clientes?.nombre || 'General'}</div>
                  {ticketImprimir.clientes?.dpi && <div>DPI: {ticketImprimir.clientes.dpi}</div>}
                </div>

                <div className="border-t border-dashed border-black mt-2 mb-2"></div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="w-8 pb-1">CANT</th>
                      <th className="pb-1">PRODUCTO</th>
                      <th className="text-right pb-1">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="align-top pr-2 font-bold">{ticketImprimir.cantidad}</td>
                      <td className="align-top pr-2">{ticketImprimir.productos?.nombre || 'Producto'}</td>
                      <td className="align-top text-right">Q {Number(ticketImprimir.total).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-t border-dashed border-black mt-2 mb-2"></div>

                <div className="text-right font-bold text-[14px] mt-2 mb-2">
                  TOTAL: Q {Number(ticketImprimir.total).toFixed(2)}
                </div>

                <div className="text-center mt-6">
                  <div className="border-t border-dashed border-black mt-2 mb-2"></div>
                  {ticketImprimir.tipo_transaccion === 'Donación' ? (
                    <>
                      <p className="font-bold mt-1">AYUDA SOCIAL MUNICIPAL</p>
                      <p className="mt-1">Subsidiado al 100%</p>
                    </>
                  ) : (
                    <p className="mt-1">Gracias por su confianza</p>
                  )}
                  <br/><br/><p>.</p> 
                </div>
              </div>

            </div>

            <div className="p-4 bg-white dark:bg-[#1E1E1E] border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
              <button onClick={() => setTicketImprimir(null)} className="px-4 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 transition-all">
                Cancelar
              </button>
              
              <div className="flex-1 flex gap-3">
                <button onClick={descargarTicketImagen} className="px-4 py-3 rounded-xl font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 transition-all flex-1 flex items-center justify-center gap-2">
                  <Download size={18} /> <span className="hidden sm:inline">Imagen</span>
                </button>

                <button onClick={mandarAImpresoraTermica} className="px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-all flex-1 flex items-center justify-center gap-2">
                  <Printer size={18} /> Imprimir
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}