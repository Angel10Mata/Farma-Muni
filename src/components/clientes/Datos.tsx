"use client";

import { useState } from "react";
import Link from "next/link";
import Swal from 'sweetalert2'; 
import {
  User,
  Mail,
  Phone,
  MapPin,
  UserPlus,
  Save,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export default function Clientes() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log("Enviando datos del cliente:", { nombre, correo, telefono, direccion });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // ALERTA CORREGIDA
    Swal.fire({
      title: '¡Éxito!',
      text: 'El cliente ha sido registrado correctamente.',
      icon: 'success',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#059669',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-3xl' // Usamos Tailwind para redondear los bordes
      }
    });
    
    setNombre("");
    setCorreo("");
    setTelefono("");
    setDireccion("");
    setLoading(false);
  };

  const inputBaseClasses =
    "w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 text-gray-900 text-sm rounded-xl transition-all outline-none hover:bg-white hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100/50";

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
        
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white flex items-center justify-between relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
              <UserPlus size={32} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                Nuevo Cliente
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                Ingresa los datos de contacto para tu base de clientes.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-base">
          <div>
            <label htmlFor="nombre" className={labelClasses}>
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-emerald-500" />
              </div>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputBaseClasses}
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="correo" className={labelClasses}>
                Correo electrónico
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-emerald-500" />
                </div>
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className={inputBaseClasses}
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefono" className={labelClasses}>
                Teléfono <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-emerald-500" />
                </div>
                <input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className={inputBaseClasses}
                  placeholder="+502 1234 5678"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="direccion" className={labelClasses}>
              Dirección
            </label>
            <div className="relative mt-1">
              <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                <MapPin className="h-5 w-5 text-teal-500" />
              </div>
              <textarea
                id="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className={`${inputBaseClasses} py-4 min-h-[100px] resize-y`}
                rows={3}
                placeholder="Ciudad, zona, calle, número..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all transform active:scale-[0.98] shadow-lg hover:shadow-emerald-500/30 mt-4
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registrando...
              </>
            ) : (
              <>
                <Save size={22} />
                Registrar Cliente
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}