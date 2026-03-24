"use client";

import { useState } from "react";
import Swal from 'sweetalert2'; 
import { crearVentaAction, eliminarVentaAction } from "@/lib/actions"; 
import { 
  User, Package, Hash, Save, Sparkles, 
  Trash2, Receipt, X, HeartHandshake, ClipboardPlus 
} from "lucide-react";

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
  
  // NUEVOS ESTADOS DE FARMACIA
  const [tipoTransaccion, setTipoTransaccion] = useState(ventaActual?.tipo_transaccion || "Venta Normal");
  const [recetaMedica, setRecetaMedica] = useState(ventaActual?.receta_medica || "");
  
  const [loading, setLoading] = useState(false);

  const productoSeleccionado = productos.find(p => p.id === productoId);

  const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorIngresado = e.target.value;
    
    if (productoSeleccionado && parseInt(valorIngresado) > productoSeleccionado.stock) {
      const isDark = document.documentElement.classList.contains('dark');
      Swal.fire({
        toast: true, position: 'top-end', icon: 'warning', title: 'Stock límite',
        text: `Solo hay ${productoSeleccionado.stock} unidades.`, showConfirmButton: false, timer: 3000,
        background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000',
      });
      setCantidad(productoSeleccionado.stock.toString());
    } else {
      setCantidad(valorIngresado);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const datosVenta = { 
      cliente_id: clienteId, 
      producto_id: productoId, 
      cantidad,
      tipo_transaccion: tipoTransaccion,
      receta_medica: recetaMedica || null
    };
    
    const result = await crearVentaAction(datosVenta);

    if (result.success) {
      const isDark = document.documentElement.classList.contains('dark');
      Swal.fire({
        toast: true, position: 'top-end', title: 'Entrega Registrada', icon: 'success',
        showConfirmButton: false, timer: 2000,
        background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000',
      });
      if (onCompletado) onCompletado();
    } else {
      Swal.fire('Error', result.error || 'No se pudo registrar.', 'error');
    }
    setLoading(false);
  };

  const handleEliminar = async () => {
    if (!ventaActual?.id) return;
    const isDark = document.documentElement.classList.contains('dark');

    const confirmacion = await Swal.fire({
      title: '¿Anular entrega?', text: "El medicamento regresará al inventario.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonText: 'Cancelar',
      background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000',
    });

    if (confirmacion.isConfirmed) {
      setLoading(true);
      const res = await eliminarVentaAction(ventaActual.id, ventaActual.producto_id, ventaActual.cantidad);
      if (res.success) {
        Swal.fire({ toast: true, position: 'top-end', title: 'Anulada', icon: 'success', showConfirmButton: false, timer: 2000, background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
        if (onCompletado) onCompletado();
      }
      setLoading(false);
    }
  };

  const inputBaseClasses = "w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl transition-all outline-none hover:bg-white dark:hover:bg-black/40 hover:border-orange-300 dark:hover:border-orange-500/50 focus:border-orange-500 focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-orange-100/50 appearance-none";
  const labelClasses = "block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300";

  return (
    <div className="w-full bg-white dark:bg-[#1E1E1E] shadow-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors duration-200">
      
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex items-center justify-between relative overflow-hidden">
        <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
            <HeartHandshake size={28} className="text-white drop-shadow-sm" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">{ventaActual ? "Detalle de Entrega" : "Dispensar Medicamento"}</h2>
            <p className="text-orange-100 text-sm mt-0.5">Ventas y donaciones de la farmacia municipal.</p>
          </div>
        </div>
        <button type="button" onClick={onCancelar} className="relative z-10 bg-black/10 hover:bg-black/20 p-2 rounded-full transition-colors backdrop-blur-sm" title="Cerrar"><X size={24} /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Paciente <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-orange-500" /></div>
              <select disabled={!!ventaActual} value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inputBaseClasses} required>
                <option value="" disabled>Selecciona el paciente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClasses}>Tipo de Entrega <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><HeartHandshake className="h-5 w-5 text-orange-500" /></div>
              <select disabled={!!ventaActual} value={tipoTransaccion} onChange={(e) => setTipoTransaccion(e.target.value)} className={inputBaseClasses} required>
                <option value="Venta Normal">Venta Normal (Cobro Regular)</option>
                <option value="Donación">Donación (Ayuda Social Q0.00)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className={labelClasses}>Medicamento <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Package className="h-5 w-5 text-orange-500" /></div>
              <select disabled={!!ventaActual} value={productoId} onChange={(e) => { setProductoId(e.target.value); setCantidad(""); }} className={inputBaseClasses} required>
                <option value="" disabled>Selecciona el medicamento...</option>
                {productos.filter(p => p.stock > 0 || !!ventaActual).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (Disponibles: {p.stock})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Cantidad <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Hash className="h-5 w-5 text-orange-500" /></div>
              <input disabled={!!ventaActual || !productoId} type="number" min="1" max={productoSeleccionado?.stock} value={cantidad} onChange={handleCantidadChange} className={inputBaseClasses} placeholder="# 1" required />
            </div>
          </div>
        </div>

        {/* CAMPO DE RECETA MÉDICA */}
        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
          <label className={labelClasses}>No. de Receta o Médico Autorizado (Opcional)</label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><ClipboardPlus className="h-5 w-5 text-orange-600" /></div>
            <input disabled={!!ventaActual} type="text" value={recetaMedica} onChange={(e) => setRecetaMedica(e.target.value)} className={inputBaseClasses} placeholder="Ej. Dr. Pérez - Receta #4592" />
          </div>
        </div>

        {productoSeleccionado && (
          <div className={`border rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all animate-in fade-in ${tipoTransaccion === 'Donación' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${tipoTransaccion === 'Donación' ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'}`}>
                <Receipt size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Precio Unitario Base</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Q {productoSeleccionado.precio}</p>
              </div>
            </div>
            
            <div className={`text-center md:text-right w-full md:w-auto border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 ${tipoTransaccion === 'Donación' ? 'border-emerald-200 dark:border-emerald-800' : 'border-orange-200 dark:border-orange-500/20'}`}>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total a Pagar por Paciente</p>
              
              {tipoTransaccion === 'Donación' ? (
                <div>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">Q 0.00</p>
                  <p className="text-xs font-bold text-emerald-600 mt-1">Subsidiado por la Municipalidad</p>
                </div>
              ) : (
                <p className="text-3xl font-black text-orange-600 dark:text-orange-500">
                  Q {(productoSeleccionado.precio * (Number(cantidad) || 0)).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
          <button type="button" onClick={onCancelar} className="px-6 py-4 rounded-xl text-lg font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95">Cancelar</button>

          {!ventaActual && (
            <button type="submit" disabled={loading || !productoId} className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 ${loading || !productoId ? "bg-gray-400 dark:bg-gray-700" : "bg-orange-600 hover:bg-orange-700 shadow-orange-500/30"}`}>
              {loading ? "Procesando..." : <><Save size={22} /> Registrar Entrega</>}
            </button>
          )}

          {ventaActual && (
            <button type="button" onClick={handleEliminar} disabled={loading} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 bg-red-500 hover:bg-red-600">
              <Trash2 size={22} /> Anular Entrega y Devolver Stock
            </button>
          )}
        </div>
      </form>
    </div>
  );
}