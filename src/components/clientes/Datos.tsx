"use client";

import { useState, useEffect } from "react";
import Swal from 'sweetalert2'; 
import { crearClienteAction, editarClienteAction, eliminarClienteAction } from "@/lib/actions"; 
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Sparkles,
  ArrowLeft,
  UserPlus,
  Trash2 
} from "lucide-react";

interface ClienteProps {
  clienteActual?: any; 
  onCompletado?: () => void; 
  onCancelar?: () => void; 
}

export default function Datos({ clienteActual, onCompletado, onCancelar }: ClienteProps) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState(""); 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clienteActual) {
      setNombre(clienteActual.nombre || "");
      setEmail(clienteActual.email || "");
      setTelefono(clienteActual.telefono || "");
      setDireccion(clienteActual.direccion || "");
    }
  }, [clienteActual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const datosCliente = { nombre, email, telefono, direccion };
    let result;
    
    if (clienteActual?.id) {
      result = await editarClienteAction(clienteActual.id, datosCliente);
    } else {
      result = await crearClienteAction(datosCliente);
    }

    if (result.success) {
      const isDark = document.documentElement.classList.contains('dark');
      Swal.fire({
        title: '¡Éxito!',
        text: clienteActual ? 'Cliente actualizado.' : 'Cliente registrado exitosamente.',
        icon: 'success',
        confirmButtonColor: '#059669', // Color esmeralda para coincidir con tu diseño
        background: isDark ? '#1E1E1E' : '#ffffff',
        color: isDark ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-3xl border border-gray-200 dark:border-gray-800' }
      });

      if (!clienteActual) {
        setNombre(""); setEmail(""); setTelefono(""); setDireccion("");
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
    if (!clienteActual?.id) return;
    const isDark = document.documentElement.classList.contains('dark');

    const confirmacion = await Swal.fire({
      title: '¿Eliminar cliente?',
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
      const res = await eliminarClienteAction(clienteActual.id);
      if (res.success) {
        Swal.fire({ title: 'Eliminado', text: 'El cliente ha sido borrado.', icon: 'success', background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
        if (onCompletado) onCompletado();
      } else {
        Swal.fire('Error', res.error, 'error');
      }
      setLoading(false);
    }
  };

  const inputBaseClasses = "w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl transition-all outline-none hover:bg-white dark:hover:bg-black/40 hover:border-emerald-300 dark:hover:border-emerald-500/50 focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-emerald-100/50 dark:focus:ring-emerald-500/20 placeholder:text-gray-400 dark:placeholder:text-gray-600";
  const labelClasses = "block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-transparent transition-colors duration-200">
      
      <div className="w-full max-w-2xl mb-4">
        <button type="button" onClick={() => { if (onCancelar) onCancelar(); else window.history.back(); }} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group bg-transparent border-none cursor-pointer p-0">
          <div className="p-2 bg-white dark:bg-[#1E1E1E] rounded-full shadow-sm border border-gray-200 dark:border-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-white/5 transition-all">
            <ArrowLeft size={18} />
          </div>
          Volver al Panel
        </button>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-[#1E1E1E] shadow-2xl rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors duration-200">
        
        {/* Encabezado Verde Esmeralda */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white flex items-center justify-between relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
              <UserPlus size={32} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                {clienteActual ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
              <p className="text-emerald-100 text-sm mt-1">Ingresa los datos de contacto para tu base de clientes.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label htmlFor="nombre" className={labelClasses}>Nombre completo <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-emerald-500" /></div>
              <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputBaseClasses} placeholder="Ej. Juan Pérez" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className={labelClasses}>Correo electrónico</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-emerald-500" /></div>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputBaseClasses} placeholder="ejemplo@correo.com" />
              </div>
            </div>

            <div>
              <label htmlFor="telefono" className={labelClasses}>Teléfono <span className="text-red-500">*</span></label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-emerald-500" /></div>
                <input id="telefono" type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputBaseClasses} placeholder="+502 1234 5678" required />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="direccion" className={labelClasses}>Dirección</label>
            <div className="relative mt-1">
              <div className="absolute top-4 left-0 pl-4 pointer-events-none"><MapPin className="h-5 w-5 text-teal-500" /></div>
              <textarea id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={`${inputBaseClasses} py-4 min-h-[100px] resize-none`} rows={3} placeholder="Ciudad, zona, calle, número..." />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 ${loading ? "bg-gray-400 dark:bg-gray-600" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"}`}>
              {loading ? "Procesando..." : <><Save size={22} /> {clienteActual ? "Actualizar Cliente" : "Registrar Cliente"}</>}
            </button>
            {clienteActual && (
              <button type="button" onClick={handleEliminar} disabled={loading} className="flex items-center justify-center p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 bg-red-500 hover:bg-red-600 px-6" title="Eliminar cliente">
                <Trash2 size={22} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}