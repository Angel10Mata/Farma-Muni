"use client";

import { useState } from "react";
import Link from "next/link";
// Importamos SweetAlert2
import Swal from 'sweetalert2'; 
import {
  Tag,
  BadgeDollarSign,
  FileText,
  ShoppingBasket,
  Save,
  Sparkles,
  ArrowLeft, 
} from "lucide-react";

export default function Articulo() {
  // Estados del formulario
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulamos una petición al servidor
    console.log("Enviando datos:", { nombre, precio, descripcion });
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simula espera

    // ALERTA ELEGANTE CON SWEETALERT2
    Swal.fire({
      title: '¡Éxito!',
      text: 'El artículo ha sido creado correctamente.',
      icon: 'success',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#2563EB',
      background: '#ffffff',
      // Usamos las clases de Tailwind en lugar de CSS directo
      customClass: {
        popup: 'rounded-3xl' 
      }
    });

    // Resetear formulario
    setNombre("");
    setPrecio("");
    setDescripcion("");
    setLoading(false);
  };

  // Clases comunes para los inputs para mantener consistencia
  const inputBaseClasses =
    "w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 text-gray-900 text-sm rounded-xl transition-all outline-none hover:bg-white hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/50";

  const labelClasses = "block mb-2 text-sm font-bold text-gray-700";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gray-50/50">
      
      {/* --- BOTÓN PARA REGRESAR AL PANEL --- */}
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

      {/* Tarjeta del formulario */}
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
        {/* Encabezado Vistoso */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white flex items-center justify-between relative overflow-hidden">
           {/* Elemento decorativo de fondo */}
          <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
              <ShoppingBasket size={32} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                Nuevo Artículo
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Ingresa los detalles para el punto de venta.
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8 text-base">
          {/* --- Campo: Nombre --- */}
          <div>
            <label htmlFor="nombre" className={labelClasses}>
              Nombre del producto <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Tag className="h-5 w-5 text-blue-500" />
              </div>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputBaseClasses}
                placeholder="Ej. Camiseta Premium Edición Limitada"
                required
              />
            </div>
          </div>

          {/* --- Campo: Precio --- */}
          <div>
            <label htmlFor="precio" className={labelClasses}>
              Precio de venta (GTQ) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <BadgeDollarSign className="h-5 w-5 text-green-500" />
              </div>
              <input
                id="precio"
                type="number"
                step="0.01"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className={inputBaseClasses}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* --- Campo: Descripción --- */}
          <div>
            <label htmlFor="descripcion" className={labelClasses}>
              Descripción detallada
            </label>
            <div className="relative mt-1">
              <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                <FileText className="h-5 w-5 text-indigo-400" />
              </div>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className={`${inputBaseClasses} py-4 min-h-[120px] resize-y`}
                rows={4}
                placeholder="Características principales, material, etc..."
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">
              {descripcion.length} caracteres
            </p>
          </div>

          {/* --- Botón de Acción --- */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all transform active:scale-[0.98] shadow-lg hover:shadow-blue-500/30
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:to-indigo-900"
              }`}
          >
            {loading ? (
              <>
                {/* Spinner simple */}
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <Save size={22} />
                Guardar Artículo
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}