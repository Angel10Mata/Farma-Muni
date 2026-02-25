"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; 
import { createClient } from "@/utils/supabase/client";
import Articulo from "@/components/productos/Articulo";
import { Edit, Plus, Search, ArrowLeft, AlertTriangle } from "lucide-react"; 

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const cargarProductos = async () => {
    setCargando(true);
    const supabase = createClient(); 
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProductos(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleFormularioCompletado = () => {
    setMostrarFormulario(false);
    setProductoSeleccionado(null);
    cargarProductos(); 
  };

  const productosFiltrados = productos.filter((prod) =>
    prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (prod.descripcion && prod.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
  );

  if (mostrarFormulario) {
    return (
      <div className="relative">
        <Articulo 
          productoActual={productoSeleccionado} 
          onCompletado={handleFormularioCompletado} 
          onCancelar={() => {
            setMostrarFormulario(false);
            setProductoSeleccionado(null);
          }}
        />
      </div>
    );
  }

  return (
    <main className="p-8 w-full max-w-6xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      <div className="mb-6 w-full">
        <Link 
          href="/kore" 
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group w-fit"
        >
          <div className="p-2 bg-white dark:bg-[#1E1E1E] rounded-full shadow-sm border border-gray-200 dark:border-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-white/5 transition-all">
            <ArrowLeft size={18} />
          </div>
          Volver al Panel
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Gestión de Productos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Administra tu inventario de la base de datos.</p>
        </div>
        
        <button 
          onClick={() => {
            setProductoSeleccionado(null); 
            setMostrarFormulario(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {!cargando && productos.length > 0 && (
        <div className="mb-6 relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100 transition-colors shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        </div>
      )}

      {cargando ? (
        <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse">Cargando inventario desde Supabase...</p>
      ) : productos.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No hay productos registrados todavía.</p>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No se encontraron productos que coincidan con "{busqueda}".</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                <th className="p-4 font-bold">Nombre</th>
                <th className="p-4 font-bold hidden md:table-cell">Descripción</th>
                <th className="p-4 font-bold text-center">Stock</th>
                <th className="p-4 font-bold">Precio (GTQ)</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((prod) => {
                // LOGICA DE ALERTA: Evaluamos si está en nivel crítico
                const stockMinimo = prod.stock_minimo || 5; // Usa 5 si el dato es antiguo y está vacío
                const enAlerta = prod.stock <= stockMinimo;

                return (
                  <tr key={prod.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">{prod.nombre}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm truncate max-w-[200px] hidden md:table-cell">
                      {prod.descripcion || "Sin descripción"}
                    </td>
                    <td className="p-4 text-center">
                      {/* ETIQUETA DINÁMICA DE STOCK */}
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                        enAlerta 
                          ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' 
                          : 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                      }`}>
                        {enAlerta && <AlertTriangle size={14} className={enAlerta ? "animate-pulse" : ""} />}
                        <span>{prod.stock}</span>
                      </div>
                      {enAlerta && <p className="text-[10px] text-red-500 mt-1 font-semibold">¡Stock Bajo!</p>}
                    </td>
                    <td className="p-4 font-bold text-blue-600 dark:text-blue-400">Q {prod.precio}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => {
                          setProductoSeleccionado(prod);
                          setMostrarFormulario(true);
                        }}
                        className="text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 p-2 rounded-lg transition-colors border border-transparent dark:border-blue-500/20"
                        title="Editar producto"
                      >
                        <Edit size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}