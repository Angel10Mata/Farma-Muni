"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; 
import { createClient } from "@/utils/supabase/client";
import Datos from "@/components/clientes/Datos"; // Importamos el formulario
import { Edit, Plus, Search, ArrowLeft } from "lucide-react"; 

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
      .order("created_at", { ascending: false });

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
    (cliente.email && cliente.email.toLowerCase().includes(busqueda.toLowerCase())) ||
    (cliente.telefono && cliente.telefono.includes(busqueda))
  );

  if (mostrarFormulario) {
    return (
      <div className="relative">
        <Datos 
          clienteActual={clienteSeleccionado} 
          onCompletado={handleFormularioCompletado} 
          onCancelar={() => {
            setMostrarFormulario(false);
            setClienteSeleccionado(null);
          }}
        />
      </div>
    );
  }

  return (
    <main className="p-8 w-full max-w-6xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      <div className="mb-6 w-full">
        <Link href="/kore" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group w-fit">
          <div className="p-2 bg-white dark:bg-[#1E1E1E] rounded-full shadow-sm border border-gray-200 dark:border-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-white/5 transition-all">
            <ArrowLeft size={18} />
          </div>
          Volver al Panel
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Directorio de Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Administra la base de datos de tus compradores.</p>
        </div>
        
        <button onClick={() => { setClienteSeleccionado(null); setMostrarFormulario(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
          <Plus size={20} /> Nuevo Cliente
        </button>
      </div>

      {!cargando && clientes.length > 0 && (
        <div className="mb-6 relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, correo o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-gray-100 transition-colors shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        </div>
      )}

      {cargando ? (
        <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse">Cargando directorio desde Supabase...</p>
      ) : clientes.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No hay clientes registrados todavía.</p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No se encontraron clientes que coincidan con "{busqueda}".</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-bold">Nombre</th>
                <th className="p-4 font-bold hidden md:table-cell">Contacto</th>
                <th className="p-4 font-bold hidden lg:table-cell">Dirección</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">{cliente.nombre}</td>
                  <td className="p-4 hidden md:table-cell">
                    <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-gray-100 text-sm">{cliente.telefono}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{cliente.email || "Sin correo"}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-sm truncate max-w-[200px] hidden lg:table-cell">
                    {cliente.direccion || "No especificada"}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => { setClienteSeleccionado(cliente); setMostrarFormulario(true); }}
                      className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 p-2 rounded-lg transition-colors border border-transparent dark:border-emerald-500/20"
                      title="Editar cliente"
                    >
                      <Edit size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}