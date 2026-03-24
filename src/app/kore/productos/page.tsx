"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import Articulo from "@/components/productos/Articulo";
import { Edit, Plus, Search, Home, ChevronRight, Package, AlertOctagon, Clock, FileText, FileSpreadsheet, Download } from "lucide-react"; 

// IMPORTACIONES PARA REPORTES
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const cargarProductos = async () => {
    setCargando(true);
    const supabase = createClient(); 
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProductos(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleFormularioCompletado = () => {
    setMostrarFormulario(false);
    setProductoSeleccionado(null);
    cargarProductos(); 
  };

  const productosFiltrados = productos.filter((prod) =>
    prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (prod.descripcion && prod.descripcion.toLowerCase().includes(busqueda.toLowerCase())) ||
    (prod.lote && prod.lote.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const calcularVencimiento = (fechaStr: string) => {
    if (!fechaStr) return { estado: 'ok', texto: 'Sin fecha' };
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 
    const fechaCaducidad = new Date(fechaStr);
    fechaCaducidad.setDate(fechaCaducidad.getDate() + 1); 
    
    const diferenciaTiempo = fechaCaducidad.getTime() - hoy.getTime();
    const diasFaltantes = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));

    if (diasFaltantes < 0) return { estado: 'vencido', texto: `Expiró hace ${Math.abs(diasFaltantes)} días` };
    if (diasFaltantes === 0) return { estado: 'vencido', texto: 'Expira HOY' };
    if (diasFaltantes <= 90) return { estado: 'alerta', texto: `Vence en ${diasFaltantes} días` };
    return { estado: 'ok', texto: fechaCaducidad.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' }) };
  };

  // ==========================================
  //    GENERADOR DE REPORTE PDF
  // ==========================================
  const exportarPDF = () => {
    const doc = new jsPDF();
    const fechaReporte = new Date().toLocaleDateString('es-GT');

    // Encabezado Institucional
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Municipalidad de Concepción Las Minas", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Farma-Muni Control - Reporte de Inventario Físico", 14, 28);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${fechaReporte}`, 14, 34);

    // Preparar datos para la tabla
    const tableData = productosFiltrados.map(p => {
      const venci = p.fecha_caducidad ? new Date(p.fecha_caducidad) : null;
      if (venci) venci.setDate(venci.getDate() + 1);
      const strVencimiento = venci ? venci.toLocaleDateString('es-GT') : 'N/A';

      return [
        p.nombre,
        p.lote || 'N/A',
        strVencimiento,
        p.stock.toString(),
        `Q ${p.precio.toFixed(2)}`
      ];
    });

    // Dibujar la tabla
    autoTable(doc, {
      startY: 40,
      head: [['Medicamento', 'Lote', 'Caducidad', 'Stock', 'Precio (Q)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Color Esmeralda
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 249, 246] }
    });

    // Descargar
    doc.save(`Inventario_FarmaMuni_${fechaReporte.replace(/\//g, '-')}.pdf`);
  };

  // ==========================================
  //    GENERADOR DE REPORTE EXCEL
  // ==========================================
  const exportarExcel = () => {
    const fechaReporte = new Date().toLocaleDateString('es-GT');
    
    // Limpiar los datos para el Excel
    const datosExcel = productosFiltrados.map(p => {
      const venci = p.fecha_caducidad ? new Date(p.fecha_caducidad) : null;
      if (venci) venci.setDate(venci.getDate() + 1);
      
      return {
        "Nombre del Medicamento": p.nombre,
        "Descripción": p.descripcion || "",
        "Lote": p.lote || "N/A",
        "Fecha de Caducidad": venci ? venci.toLocaleDateString('es-GT') : "N/A",
        "Stock Físico": p.stock,
        "Alerta Mínima": p.stock_minimo,
        "Precio Unitario (Q)": p.precio
      };
    });

    // Crear la hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

    // Descargar
    XLSX.writeFile(workbook, `Inventario_FarmaMuni_${fechaReporte.replace(/\//g, '-')}.xlsx`);
  };

  return (
    <main className="p-8 w-full max-w-7xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200 relative">
      
      <div className="mb-6 w-full">
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-[#1E1E1E]/50 w-fit px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm backdrop-blur-sm">
          <Link href="/kore" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"><Home size={16} /> Panel</Link>
          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
          <span className="text-gray-900 dark:text-gray-100 font-bold flex items-center gap-1.5"><Package size={16} className="text-blue-500" /> Farmacia</span>
        </nav>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Inventario de Medicamentos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Control de stock, lotes y vencimientos de Farma-Muni.</p>
        </div>
        <button onClick={() => { setProductoSeleccionado(null); setMostrarFormulario(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
          <Plus size={20} /> Registrar Medicina
        </button>
      </div>

      {!cargando && productos.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 w-full">
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
            <input type="text" placeholder="Buscar por medicina o lote..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100 transition-colors shadow-sm" />
          </div>
          
          {/* BOTONES DE EXPORTACIÓN */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm font-bold text-gray-500 hidden lg:block mr-2">Exportar:</span>
            <button onClick={exportarPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-4 py-3 rounded-xl font-bold transition-all border border-red-200 dark:border-red-900/50">
              <FileText size={18} /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={exportarExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 px-4 py-3 rounded-xl font-bold transition-all border border-emerald-200 dark:border-emerald-900/50">
              <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-gray-500 font-bold animate-pulse">Cargando inventario farmacéutico...</p>
      ) : productos.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 shadow-sm"><p className="text-gray-500 text-lg">No hay medicinas registradas todavía.</p></div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 shadow-sm"><p className="text-gray-500 text-lg">No se encontraron resultados para "{busqueda}".</p></div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-bold">Medicamento</th>
                <th className="p-4 font-bold hidden lg:table-cell">Lote y Vencimiento</th>
                <th className="p-4 font-bold text-center">Stock</th>
                <th className="p-4 font-bold">Precio</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((prod) => {
                const enAlerta = prod.stock <= (prod.stock_minimo || 5);
                const infoVencimiento = calcularVencimiento(prod.fecha_caducidad);

                return (
                  <tr key={prod.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{prod.nombre}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{prod.descripcion || "Sin descripción"}</p>
                    </td>
                    
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 w-fit px-2 py-0.5 rounded-md">
                          Lote: {prod.lote || "N/A"}
                        </span>
                        
                        {infoVencimiento.estado === 'vencido' && (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                            <AlertOctagon size={14} /> {infoVencimiento.texto}
                          </span>
                        )}
                        {infoVencimiento.estado === 'alerta' && (
                          <span className="flex items-center gap-1 text-xs font-bold text-orange-500 dark:text-orange-400 mt-1">
                            <Clock size={14} /> {infoVencimiento.texto}
                          </span>
                        )}
                        {infoVencimiento.estado === 'ok' && (
                          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 mt-1">
                            Caduca: {infoVencimiento.texto}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${enAlerta ? 'bg-red-100 text-red-700 border-red-500/20' : 'bg-green-100 text-green-700 border-green-500/20'}`}>
                        <span>{prod.stock}</span>
                      </div>
                      {enAlerta && <p className="text-[10px] text-red-500 mt-1 font-semibold">¡Stock Bajo!</p>}
                    </td>
                    <td className="p-4 font-bold text-blue-600 dark:text-blue-400">Q {prod.precio}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => { setProductoSeleccionado(prod); setMostrarFormulario(true); }} className="text-blue-500 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors border border-transparent dark:bg-blue-500/10 dark:hover:bg-blue-500/20" title="Editar medicina">
                        <Edit size={20} />
                      </button>
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
            <Articulo productoActual={productoSeleccionado} onCompletado={handleFormularioCompletado} onCancelar={() => { setMostrarFormulario(false); setProductoSeleccionado(null); }} />
          </div>
        </div>
      )}
    </main>
  );
}