"use client";

import { useState, useEffect } from "react";
import Swal from 'sweetalert2'; 
import { crearProductoAction, editarProductoAction, eliminarProductoAction } from "@/lib/actions"; 
import {
  Tag,
  BadgeDollarSign,
  FileText,
  ShoppingBasket,
  Save,
  Sparkles,
  ArrowLeft,
  Layers,
  AlertTriangle, // Icono para stock mínimo
  Trash2 
} from "lucide-react";

interface ArticuloProps {
  productoActual?: any; 
  onCompletado?: () => void; 
  onCancelar?: () => void; 
}

export default function Articulo({ productoActual, onCompletado, onCancelar }: ArticuloProps) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [stock, setStock] = useState(""); 
  const [stockMinimo, setStockMinimo] = useState("5"); // NUEVO ESTADO (Default 5)
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productoActual) {
      setNombre(productoActual.nombre || "");
      setPrecio(productoActual.precio || "");
      setDescripcion(productoActual.descripcion || "");
      setStock(productoActual.stock || "0");
      setStockMinimo(productoActual.stock_minimo?.toString() || "5"); // Cargamos el stock mínimo
    }
  }, [productoActual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const datosProducto = {
      nombre,
      precio,
      descripcion,
      stock: stock || 0,
      stock_minimo: stockMinimo || 5, // Enviamos el nuevo dato
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
        title: '¡Éxito!',
        text: productoActual ? 'Artículo actualizado.' : 'Artículo creado exitosamente.',
        icon: 'success',
        confirmButtonColor: '#2563EB',
        background: isDark ? '#1E1E1E' : '#ffffff',
        color: isDark ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-3xl border border-gray-200 dark:border-gray-800' }
      });

      if (!productoActual) {
        setNombre("");
        setPrecio("");
        setDescripcion("");
        setStock("");
        setStockMinimo("5");
      }
      if (onCompletado) onCompletado();
    } else {
      Swal.fire({
        title: 'Error',
        text: result.error || 'No se pudo procesar la solicitud.',
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
    }
    setLoading(false);
  };

  const handleEliminar = async () => {
    if (!productoActual?.id) return;
    const isDark = document.documentElement.classList.contains('dark');

    const confirmacion = await Swal.fire({
      title: '¿Eliminar artículo?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: isDark ? '#1E1E1E' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000',
      customClass: { popup: 'rounded-3xl border border-gray-200 dark:border-gray-800' }
    });

    if (confirmacion.isConfirmed) {
      setLoading(true);
      const res = await eliminarProductoAction(productoActual.id);
      if (res.success) {
        Swal.fire({ title: 'Eliminado', text: 'Borrado con éxito.', icon: 'success', background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
        if (onCompletado) onCompletado();
      } else {
        Swal.fire('Error', res.error, 'error');
      }
      setLoading(false);
    }
  };

  const inputBaseClasses = "w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl transition-all outline-none hover:bg-white dark:hover:bg-black/40 hover:border-blue-300 dark:hover:border-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-500/20 placeholder:text-gray-400 dark:placeholder:text-gray-600";
  const labelClasses = "block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-transparent transition-colors duration-200">
      <div className="w-full max-w-2xl mb-4">
        <button 
          type="button"
          onClick={() => { if (onCancelar) onCancelar(); else window.history.back(); }}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group bg-transparent border-none cursor-pointer p-0"
        >
          <div className="p-2 bg-white dark:bg-[#1E1E1E] rounded-full shadow-sm border border-gray-200 dark:border-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-white/5 transition-all">
            <ArrowLeft size={18} />
          </div>
          Volver al Panel
        </button>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-[#1E1E1E] shadow-2xl rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white flex items-center justify-between relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
              <ShoppingBasket size={32} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                {productoActual ? "Editar Artículo" : "Nuevo Artículo"}
              </h2>
              <p className="text-blue-100 text-sm mt-1">Sincronizado con tabla de productos de Supabase.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label htmlFor="nombre" className={labelClasses}>Nombre <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Tag className="h-5 w-5 text-blue-500" /></div>
              <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputBaseClasses} placeholder="Nombre del producto" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="precio" className={labelClasses}>Precio <span className="text-red-500">*</span></label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><BadgeDollarSign className="h-5 w-5 text-green-500" /></div>
                <input id="precio" type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={inputBaseClasses} placeholder="0.00" required />
              </div>
            </div>

            <div>
              <label htmlFor="stock" className={labelClasses}>Stock Actual</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Layers className="h-5 w-5 text-blue-500" /></div>
                <input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className={inputBaseClasses} placeholder="0" />
              </div>
            </div>

            {/* NUEVO CAMPO DE STOCK MÍNIMO */}
            <div>
              <label htmlFor="stock_minimo" className={labelClasses}>Stock Mínimo</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
                <input id="stock_minimo" type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} className={inputBaseClasses} placeholder="5" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="descripcion" className={labelClasses}>Descripción</label>
            <div className="relative mt-1">
              <div className="absolute top-4 left-0 pl-4 pointer-events-none"><FileText className="h-5 w-5 text-indigo-400" /></div>
              <textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputBaseClasses} py-4 min-h-[100px] resize-none`} rows={3} placeholder="Detalles del producto..." />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 ${loading ? "bg-gray-400 dark:bg-gray-600" : "bg-blue-600 hover:bg-blue-700"}`}>
              {loading ? "Procesando..." : <><Save size={22} /> {productoActual ? "Actualizar" : "Guardar"}</>}
            </button>
            {productoActual && (
              <button type="button" onClick={handleEliminar} disabled={loading} className="flex items-center justify-center p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 bg-red-500 hover:bg-red-600 px-6" title="Eliminar producto">
                <Trash2 size={22} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}