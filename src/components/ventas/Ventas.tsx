"use client";

import { useState } from "react";
import Link from "next/link";
import Swal from 'sweetalert2'; 
import {
  ShoppingCart,
  User,
  Package,
  Hash,
  Save,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export default function Ventas() {
  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log("Registrando Venta:", { cliente, producto, cantidad });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // ALERTA CORREGIDA
    Swal.fire({
      title: '¡Éxito!',
      text: 'La venta ha sido completada correctamente.',
      icon: 'success',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#F59E0B',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-3xl' // Usamos Tailwind para redondear los bordes
      }
    });
    
    setCliente("");
    setProducto("");
    setCantidad("1");
    setLoading(false);
  };

  const inputBaseClasses =
    "w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 text-gray-900 text-sm rounded-xl transition-all outline-none hover:bg-white hover:border-amber-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100/50";

  const labelClasses = "block mb-2 text-sm font-bold text-gray-700";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gray-50/50">
      
      <div className="w-full max-w-2xl mb-4">
        <Link 
          href="/kore" 
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <div className="p-2 bg-white rounded-full shadow-sm border border-gray-200 group-hover:bg-gray-100 group-hover:border-gray-300 transition-all">
            <ArrowLeft size={18} />
          </div>
          Volver al Panel
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
        
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white flex items-center justify-between relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
              <ShoppingCart size={32} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                Nueva Venta
              </h2>
              <p className="text-amber-100 text-sm mt-1">
                Registra una nueva transacción de salida.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-base">
          
          <div>
            <label htmlFor="cliente" className={labelClasses}>
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-amber-500" />
              </div>
              <input
                id="cliente"
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className={inputBaseClasses}
                placeholder="Nombre del cliente"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="producto" className={labelClasses}>
                Producto a vender <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Package className="h-5 w-5 text-amber-500" />
                </div>
                <input
                  id="producto"
                  type="text"
                  value={producto}
                  onChange={(e) => setProducto(e.target.value)}
                  className={inputBaseClasses}
                  placeholder="Ej. Camiseta Premium"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="cantidad" className={labelClasses}>
                Cantidad <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-amber-500" />
                </div>
                <input
                  id="cantidad"
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className={inputBaseClasses}
                  placeholder="1"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all transform active:scale-[0.98] shadow-lg hover:shadow-amber-500/30 mt-6
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600"
              }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <Save size={22} />
                Registrar Venta
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}