"use client";

import { useState, useEffect } from "react";
import Swal from 'sweetalert2';
import { crearProductoAction, editarProductoAction, eliminarProductoAction } from "@/lib/actions";
import { 
  Package, Tag, DollarSign, Layers, AlertTriangle, AlignLeft, 
  Save, Sparkles, Trash2, X, Calendar, Hash 
} from "lucide-react";

interface ArticuloProps {
  productoActual?: any;
  onCompletado?: () => void;
  onCancelar?: () => void;
}

export default function Articulo({ productoActual, onCompletado, onCancelar }: ArticuloProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("0");
  const [stockMinimo, setStockMinimo] = useState("5");
  
  // NUEVOS ESTADOS PARA FARMACIA
  const [lote, setLote] = useState("");
  const [fechaCaducidad, setFechaCaducidad] = useState("");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productoActual) {
      setNombre(productoActual.nombre || "");
      setDescripcion(productoActual.descripcion || "");
      setPrecio(productoActual.precio?.toString() || "");
      setStock(productoActual.stock?.toString() || "0");
      setStockMinimo(productoActual.stock_minimo?.toString() || "5");
      setLote(productoActual.lote || "");
      setFechaCaducidad(productoActual.fecha_caducidad || "");
    } else {
      setNombre(""); setDescripcion(""); setPrecio(""); setStock("0"); setStockMinimo("5"); setLote(""); setFechaCaducidad("");
    }
  }, [productoActual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const datosProducto = { 
      nombre, 
      descripcion, 
      precio: Number(precio), 
      stock: Number(stock),
      stock_minimo: Number(stockMinimo),
      lote,
      // Si la fecha está vacía, enviamos null para que la base de datos no dé error
      fecha_caducidad: fechaCaducidad || null 
    };
    
    let result;
    if (productoActual?.id) {
      result = await editarProductoAction(productoActual.id, datosProducto);
    } else {
      result = await crearProductoAction(datosProducto);
    }

    if (result.success) {
      const isDark = document.documentElement.classList.contains('dark');
      Swal.fire({
        toast: true, position: 'top-end', title: productoActual ? 'Medicamento actualizado' : 'Medicamento guardado',
        icon: 'success', showConfirmButton: false, timer: 2000,
        background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000',
      });
      if (onCompletado) onCompletado();
    } else {
      Swal.fire('Error', result.error || 'No se pudo guardar.', 'error');
    }
    setLoading(false);
  };

  const handleEliminar = async () => {
    if (!productoActual?.id) return;
    const isDark = document.documentElement.classList.contains('dark');

    const confirmacion = await Swal.fire({
      title: '¿Eliminar medicamento?', text: "No podrás recuperarlo.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonText: 'Cancelar',
      background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000',
    });

    if (confirmacion.isConfirmed) {
      setLoading(true);
      const res = await eliminarProductoAction(productoActual.id);
      if (res.success) {
        Swal.fire({ toast: true, position: 'top-end', title: 'Eliminado', icon: 'success', showConfirmButton: false, timer: 2000, background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
        if (onCompletado) onCompletado();
      }
      setLoading(false);
    }
  };

  const inputBaseClasses = "w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl transition-all outline-none hover:bg-white dark:hover:bg-black/40 hover:border-blue-300 dark:hover:border-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-blue-100/50";
  const labelClasses = "block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300";

  return (
    <div className="w-full bg-white dark:bg-[#1E1E1E] shadow-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors duration-200">
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between relative overflow-hidden">
        <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
            <Package size={28} className="text-white drop-shadow-sm" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">{productoActual ? "Editar Medicamento" : "Nuevo Medicamento"}</h2>
            <p className="text-blue-100 text-sm mt-0.5">Control de inventario farmacéutico.</p>
          </div>
        </div>
        <button type="button" onClick={onCancelar} className="relative z-10 bg-black/10 hover:bg-black/20 p-2 rounded-full transition-colors backdrop-blur-sm" title="Cerrar"><X size={24} /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        <div>
          <label className={labelClasses}>Nombre Comercial o Genérico <span className="text-red-500">*</span></label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Tag className="h-5 w-5 text-blue-500" /></div>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputBaseClasses} placeholder="Ej. Paracetamol 500mg" required />
          </div>
        </div>

        {/* SECCIÓN DE FARMACIA: LOTE Y CADUCIDAD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
          <div>
            <label className={labelClasses}>Lote de Fabricación</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Hash className="h-5 w-5 text-indigo-500" /></div>
              <input type="text" value={lote} onChange={(e) => setLote(e.target.value)} className={inputBaseClasses} placeholder="Ej. L-12345" />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Fecha de Caducidad <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-indigo-500" /></div>
              <input type="date" value={fechaCaducidad} onChange={(e) => setFechaCaducidad(e.target.value)} className={inputBaseClasses} required />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClasses}>Precio (GTQ) <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><DollarSign className="h-5 w-5 text-green-500" /></div>
              <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={inputBaseClasses} placeholder="0.00" required />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Stock Actual</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Layers className="h-5 w-5 text-blue-500" /></div>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className={inputBaseClasses} placeholder="0" />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Alerta Mínima</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
              <input type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} className={inputBaseClasses} placeholder="5" />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClasses}>Descripción / Indicaciones</label>
          <div className="relative mt-1">
            <div className="absolute top-4 left-0 pl-4 pointer-events-none"><AlignLeft className="h-5 w-5 text-blue-500" /></div>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputBaseClasses} py-3 min-h-[80px] resize-none`} rows={2} placeholder="Presentación, dosis, proveedor..." />
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
          <button type="button" onClick={onCancelar} className="px-6 py-4 rounded-xl text-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95">Cancelar</button>
          <button type="submit" disabled={loading} className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"}`}>
            {loading ? "Procesando..." : <><Save size={22} /> Guardar</>}
          </button>
          {productoActual && (
            <button type="button" onClick={handleEliminar} disabled={loading} className="flex items-center justify-center p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 bg-red-500 hover:bg-red-600 px-6" title="Eliminar"><Trash2 size={22} /></button>
          )}
        </div>
      </form>
    </div>
  );
}