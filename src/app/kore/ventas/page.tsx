"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; // IMPORTANTE: Importamos Link para la navegación
import { createClient } from "@/utils/supabase/client";
import Ventas from "@/components/ventas/Ventas";
import { Plus, Search, ReceiptText, ArrowLeft } from "lucide-react"; // Añadimos ArrowLeft

export default function VentasPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  
  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const cargarDatos = async () => {
    setCargando(true);
    const supabase = createClient(); 
    
    // Cargamos las ventas con los nombres relacionados
    const { data: vts } = await supabase
      .from("ventas")
      .select(`
        *,
        clientes ( nombre ),
        productos ( nombre )
      `)
      .order("created_at", { ascending: false });

    const { data: clis } = await supabase.from("clientes").select("id, nombre").order("nombre");
    const { data: prods } = await supabase.from("productos").select("id, nombre, stock, precio").order("nombre");

    if (vts) setVentas(vts);
    if (clis) setClientes(clis);
    if (prods) setProductos(prods);
    setCargando(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleCompletado = () => {
    setMostrarFormulario(false);
    setVentaSeleccionada(null);
    cargarDatos(); 
  };

  const ventasFiltradas = ventas.filter((v) =>
    v.clientes?.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    v.productos?.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // --- MODO FORMULARIO ---
  if (mostrarFormulario) {
    return (
      <div className="relative">
        <Ventas 
          ventaActual={ventaSeleccionada} 
          clientes={clientes}
          productos={productos}
          onCompletado={handleCompletado} 
          onCancelar={() => { setMostrarFormulario(false); setVentaSeleccionada(null); }}
        />
      </div>
    );
  }

  // --- MODO TABLA ---
  return (
    <main className="p-8 w-full max-w-6xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      {/* --- BOTÓN DE REGRESO AL PANEL AÑADIDO --- */}
      <div className="mb-6 w-full">
        <Link 
          href="/kore" 
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group w-fit"
        >
          <div className="p-2 bg-white dark:bg-[#1E1E1E] rounded-full shadow-sm border border-gray-200 dark:border-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-white/5 transition-all">
            <ArrowLeft size={18} />
          </div>
          Volver al Panel
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Historial de Ventas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Registra salidas y controla tus ingresos.</p>
        </div>
        
        <button 
          onClick={() => { setVentaSeleccionada(null); setMostrarFormulario(true); }} 
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-transform active:scale-95"
        >
          <Plus size={20} /> Nueva Venta
        </button>
      </div>

      {!cargando && ventas.length > 0 && (
        <div className="mb-6 relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por cliente o producto..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 dark:text-gray-100 shadow-sm transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-600" 
          />
        </div>
      )}

      {cargando ? (
        <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse">Cargando transacciones...</p>
      ) : ventas.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No se han registrado ventas.</p>
        </div>
      ) : ventasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No se encontraron ventas que coincidan con "{busqueda}".</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-bold">Cliente</th>
                <th className="p-4 font-bold">Producto</th>
                <th className="p-4 font-bold text-center">Cant.</th>
                <th className="p-4 font-bold text-right">Total</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">{v.clientes?.nombre || "Cliente eliminado"}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{v.productos?.nombre || "Producto eliminado"}</td>
                  <td className="p-4 text-center">
                    <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 border border-transparent dark:border-gray-700">
                      {v.cantidad}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-orange-600 dark:text-orange-400 text-right">Q {v.total}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => { setVentaSeleccionada(v); setMostrarFormulario(true); }} 
                      className="text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 p-2 rounded-lg transition-colors hover:bg-orange-100 dark:hover:bg-orange-500/20 border border-transparent dark:border-orange-500/20"
                      title="Ver detalle / Anular"
                    >
                      <ReceiptText size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}