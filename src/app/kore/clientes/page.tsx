"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; 
import { createClient } from "@/utils/supabase/client";
import Datos from "@/components/clientes/Datos"; 
import { 
  Plus, Search, Home, ChevronRight, Users, 
  Edit3, User, Phone, CreditCard, MapPin 
} from "lucide-react"; 
import { Skeleton } from "@/components/ui/skeleton"; 

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const cargarClientes = async () => {
    setCargando(true);
    const supabase = createClient(); 
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre", { ascending: true }); // Ordenamos por nombre alfabéticamente

    if (!error && data) {
      setClientes(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleFormularioCompletado = () => {
    setMostrarFormulario(false);
    setClienteSeleccionado(null);
    cargarClientes(); 
  };

  const clientesFiltrados = clientes.filter((cliente) =>
    cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (cliente.dpi && cliente.dpi.includes(busqueda)) || 
    (cliente.telefono && cliente.telefono.includes(busqueda))
  );

  return (
    <main className="p-8 w-full max-w-7xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200 relative">
      
      {/* --- NAVEGACIÓN (MIGAS DE PAN) --- */}
      <div className="mb-6 w-full">
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-[#1E1E1E]/50 w-fit px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm backdrop-blur-sm">
          <Link href="/kore" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
            <Home size={16} /> Panel
          </Link>
          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
          <span className="text-gray-900 dark:text-gray-100 font-bold flex items-center gap-1.5">
            <Users size={16} className="text-emerald-500" /> Expedientes
          </span>
        </nav>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Expedientes de Pacientes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg font-medium">Base de datos comunitaria de la Municipalidad.</p>
        </div>
        
        <button 
          onClick={() => { 
            setClienteSeleccionado(null); 
            setMostrarFormulario(true);
          }} 
          className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus size={20} /> Nuevo Expediente
        </button>
      </div>

      {/* --- BARRA DE BÚSQUEDA --- */}
      <div className="mb-8 relative w-full max-w-xl group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, DPI o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#1E1E1E] border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-gray-900 dark:text-gray-100 transition-all shadow-sm text-lg"
        />
      </div>

      {/* --- LA TABLA REDISEÑADA --- */}
      {cargando ? (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-black/20 text-gray-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="p-6">Información</th>
                <th className="p-6">Contacto</th>
                <th className="p-6">Residencia</th>
                <th className="p-6 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={`sk-${i}`} className="border-t border-gray-50 dark:border-gray-800">
                  <td className="p-6"><Skeleton className="h-12 w-48 rounded-xl" /></td>
                  <td className="p-6"><Skeleton className="h-10 w-32" /></td>
                  <td className="p-6"><Skeleton className="h-10 w-40" /></td>
                  <td className="p-6"><Skeleton className="h-10 w-24 mx-auto rounded-lg" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No se encontraron pacientes registrados.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">
                <th className="p-6 font-black">Información del Paciente</th>
                <th className="p-6 font-black">Contacto y Documentación</th>
                <th className="p-6 font-black">Residencia</th>
                <th className="p-6 font-black text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-1">{cliente.nombre}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded uppercase tracking-tighter">ID: {cliente.id.split('-')[0]}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Phone size={14} className="text-emerald-500" />
                        <span className="font-bold text-sm">{cliente.telefono || "Sin teléfono"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <CreditCard size={14} className="text-gray-400" />
                        <span className="font-mono text-xs tracking-tight">DPI: {cliente.dpi || "N/A"}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-6">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-emerald-500 mt-1 shrink-0" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-snug">{cliente.direccion || "No especificada"}</p>
                    </div>
                  </td>

                  <td className="p-6 text-center">
                    <button 
                      onClick={() => { 
                        setClienteSeleccionado(cliente); 
                        setMostrarFormulario(true); 
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E1E1E] text-emerald-600 dark:text-emerald-400 border-2 border-emerald-50 dark:border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-bold text-sm transition-all active:scale-95 shadow-sm"
                    >
                      <Edit3 size={18} /> Editar Expediente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL FLOTANTE --- */}
      {mostrarFormulario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 scrollbar-hide">
            <Datos 
              clienteActual={clienteSeleccionado} 
              onCompletado={handleFormularioCompletado} 
              onCancelar={() => {
                setMostrarFormulario(false);
                setClienteSeleccionado(null);
              }}
            />
          </div>
        </div>
      )}

    </main>
  );
}