"use client";

import { useState } from "react";
import Swal from 'sweetalert2'; 
import { crearVentaAction, eliminarVentaAction } from "@/lib/actions"; 
import { User, Package, Hash, Save, Sparkles, ArrowLeft, ShoppingCart, Trash2, Receipt } from "lucide-react";

interface VentaProps {
  ventaActual?: any; 
  clientes: any[];
  productos: any[];
  onCompletado?: () => void; 
  onCancelar?: () => void; 
}

export default function Ventas({ ventaActual, clientes, productos, onCompletado, onCancelar }: VentaProps) {
  const [clienteId, setClienteId] = useState(ventaActual?.cliente_id || "");
  const [productoId, setProductoId] = useState(ventaActual?.producto_id || "");
  const [cantidad, setCantidad] = useState(ventaActual?.cantidad || "");
  const [loading, setLoading] = useState(false);

  // NUEVO: Encontramos el objeto completo del producto seleccionado para sacar su precio y stock
  const productoSeleccionado = productos.find(p => p.id === productoId);

  // NUEVO: Función inteligente para manejar el cambio de cantidad
  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorIngresado = e.target.value;
    
    // Si hay un producto seleccionado y el número ingresado supera el stock
    if (productoSeleccionado && parseInt(valorIngresado) > productoSeleccionado.stock) {
      const isDark = document.documentElement.classList.contains('dark');
      
      // Lanzamos una alerta flotante (Toast)
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Stock límite alcanzado',
        text: `Solo cuentas con ${productoSeleccionado.stock} unidades en inventario.`,
        showConfirmButton: false,
        timer: 3000,
        background: isDark ? '#1E1E1E' : '#ffffff',
        color: isDark ? '#ffffff' : '#000000',
      });
      
      // Ajustamos la cantidad al máximo permitido
      setCantidad(productoSeleccionado.stock.toString());
    } else {
      setCantidad(valorIngresado);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const datosVenta = { cliente_id: clienteId, producto_id: productoId, cantidad };
    const result = await crearVentaAction(datosVenta);

    if (result.success) {
      const isDark = document.documentElement.classList.contains('dark');
      Swal.fire({
        title: '¡Venta Registrada!',
        icon: 'success',
        confirmButtonColor: '#ea580c', 
        background: isDark ? '#1E1E1E' : '#ffffff',
        color: isDark ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-3xl border border-gray-200 dark:border-gray-800' }
      });
      if (onCompletado) onCompletado();
    } else {
      Swal.fire('Error', result.error || 'No se pudo registrar la venta.', 'error');
    }
    setLoading(false);
  };

  const handleEliminar = async () => {
    if (!ventaActual?.id) return;
    const isDark = document.documentElement.classList.contains('dark');

    const confirmacion = await Swal.fire({
      title: '¿Anular venta?',
      text: "El producto regresará al inventario.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonText: 'Cancelar',
      background: isDark ? '#1E1E1E' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000',
    });

    if (confirmacion.isConfirmed) {
      setLoading(true);
      const res = await eliminarVentaAction(ventaActual.id, ventaActual.producto_id, ventaActual.cantidad);
      if (res.success) {
        Swal.fire({ title: 'Anulada', text: 'Stock devuelto.', icon: 'success', background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
        if (onCompletado) onCompletado();
      }
      setLoading(false);
    }
  };

  const inputBaseClasses = "w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl transition-all outline-none hover:bg-white dark:hover:bg-black/40 hover:border-orange-300 dark:hover:border-orange-500/50 focus:border-orange-500 focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-orange-100/50 appearance-none";
  const labelClasses = "block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-transparent transition-colors duration-200">
      <div className="w-full max-w-2xl mb-4">
        <button type="button" onClick={onCancelar} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group bg-transparent border-none cursor-pointer p-0">
          <div className="p-2 bg-white dark:bg-[#1E1E1E] rounded-full shadow-sm border border-gray-200 dark:border-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-white/5 transition-all"><ArrowLeft size={18} /></div> Volver al Panel
        </button>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-[#1E1E1E] shadow-2xl rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white flex items-center justify-between relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner"><ShoppingCart size={32} /></div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">{ventaActual ? "Detalle de Venta" : "Nueva Venta"}</h2>
              <p className="text-orange-100 text-sm mt-1">Registra una nueva transacción de salida.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className={labelClasses}>Cliente <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-orange-500" /></div>
              <select disabled={!!ventaActual} value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inputBaseClasses} required>
                <option value="" disabled>Selecciona el cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className={labelClasses}>Producto a vender <span className="text-red-500">*</span></label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Package className="h-5 w-5 text-orange-500" /></div>
                <select 
                  disabled={!!ventaActual} 
                  value={productoId} 
                  onChange={(e) => {
                    setProductoId(e.target.value);
                    setCantidad(""); // Reiniciamos cantidad al cambiar de producto para evitar errores
                  }} 
                  className={inputBaseClasses} 
                  required
                >
                  <option value="" disabled>Selecciona el producto...</option>
                  {/* Solo mostramos productos que tengan stock > 0 */}
                  {productos.filter(p => p.stock > 0 || !!ventaActual).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Cantidad <span className="text-red-500">*</span></label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Hash className="h-5 w-5 text-orange-500" /></div>
                <input 
                  disabled={!!ventaActual || !productoId} // Deshabilitado si no hay producto seleccionado
                  type="number" 
                  min="1" 
                  max={productoSeleccionado?.stock} // Límite máximo HTML
                  value={cantidad} 
                  onChange={handleCantidadChange} // Usamos nuestra nueva función validadora
                  className={inputBaseClasses} 
                  placeholder="# 1" 
                  required 
                />
              </div>
            </div>
          </div>

          {/* NUEVO: Recuadro dinámico de resumen de precios */}
          {productoSeleccionado && (
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 dark:bg-orange-500/20 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                  <Receipt size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Precio Unitario</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Q {productoSeleccionado.precio}</p>
                </div>
              </div>
              
              <div className="text-center md:text-right w-full md:w-auto border-t md:border-t-0 md:border-l border-orange-200 dark:border-orange-500/20 pt-4 md:pt-0 md:pl-6">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total a Pagar</p>
                <p className="text-3xl font-black text-orange-600 dark:text-orange-500">
                  Q {(productoSeleccionado.precio * (Number(cantidad) || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {!ventaActual && (
              <button type="submit" disabled={loading || !productoId} className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 ${loading || !productoId ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700 shadow-orange-500/30"}`}>
                {loading ? "Procesando..." : <><Save size={22} /> Registrar Venta</>}
              </button>
            )}
            {ventaActual && (
              <button type="button" onClick={handleEliminar} disabled={loading} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 bg-red-500 hover:bg-red-600">
                <Trash2 size={22} /> Anular Venta y Devolver Stock
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}