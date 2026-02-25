"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { 
  Package, 
  Users, 
  ShoppingCart, 
  Wallet, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight
} from "lucide-react";

export default function PanelDeControl() {
  const [metricas, setMetricas] = useState({
    totalClientes: 0,
    ingresos: 0,
    alertasStock: 0,
    totalVentas: 0
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarMetricas = async () => {
      setCargando(true);
      const supabase = createClient();

      // 1. Obtener total de clientes
      const { count: countClientes } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });

      // 2. Obtener productos para calcular alertas de stock
      const { data: productos } = await supabase
        .from("productos")
        .select("stock, stock_minimo");
      
      const alertas = productos?.filter(p => p.stock <= (p.stock_minimo || 5)).length || 0;

      // 3. Obtener ventas para sumar ingresos
      const { data: ventas } = await supabase
        .from("ventas")
        .select("total");
      
      const ingresosTotales = ventas?.reduce((sum, venta) => sum + (Number(venta.total) || 0), 0) || 0;
      const totalVentas = ventas?.length || 0;

      setMetricas({
        totalClientes: countClientes || 0,
        ingresos: ingresosTotales,
        alertasStock: alertas,
        totalVentas: totalVentas
      });
      
      setCargando(false);
    };

    cargarMetricas();
  }, []);

  return (
    <main className="p-8 w-full max-w-7xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200 min-h-screen">
      
      {/* Encabezado */}
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-2">Panel de Control</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">Bienvenido al resumen operativo de tu negocio.</p>
      </div>

      {/* SECCIÓN 1: MÉTRICAS EN TIEMPO REAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        
        {/* Tarjeta: Ingresos */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Ingresos Totales</h3>
          </div>
          <p className="text-3xl font-black">
            {cargando ? "..." : `Q ${metricas.ingresos.toFixed(2)}`}
          </p>
        </div>

        {/* Tarjeta: Ventas */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ShoppingCart size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-2xl">
              <ShoppingCart size={24} />
            </div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Ventas Cerradas</h3>
          </div>
          <p className="text-3xl font-black">{cargando ? "..." : metricas.totalVentas}</p>
        </div>

        {/* Tarjeta: Clientes */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Users size={24} />
            </div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Clientes Activos</h3>
          </div>
          <p className="text-3xl font-black">{cargando ? "..." : metricas.totalClientes}</p>
        </div>

        {/* Tarjeta: Alertas de Stock */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><AlertTriangle size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Avisos de Stock</h3>
          </div>
          <p className="text-3xl font-black text-red-500">{cargando ? "..." : metricas.alertasStock}</p>
        </div>

      </div>

      <h2 className="text-2xl font-bold mb-6">Módulos del Sistema</h2>

      {/* SECCIÓN 2: ACCESOS RÁPIDOS REDISEÑADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Módulo: Inventario */}
        <Link href="/kore/productos" className="group block p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 opacity-20 group-hover:scale-125 transition-transform duration-500">
            <Package size={140} />
          </div>
          <div className="relative z-10">
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/30">
              <Package size={28} />
            </div>
            <h3 className="text-2xl font-black mb-2">Inventario</h3>
            <p className="text-blue-100 mb-8 max-w-[80%]">Administra tus productos, precios y supervisa las alertas de existencias.</p>
            <div className="flex items-center gap-2 font-bold text-white group-hover:gap-4 transition-all">
              Ir al módulo <ArrowRight size={20} />
            </div>
          </div>
        </Link>

        {/* Módulo: Clientes */}
        <Link href="/kore/clientes" className="group block p-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl text-white shadow-xl shadow-emerald-500/20 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 opacity-20 group-hover:scale-125 transition-transform duration-500">
            <Users size={140} />
          </div>
          <div className="relative z-10">
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/30">
              <Users size={28} />
            </div>
            <h3 className="text-2xl font-black mb-2">Directorio</h3>
            <p className="text-emerald-100 mb-8 max-w-[80%]">Gestiona la información de tus clientes y mantén sus datos al día.</p>
            <div className="flex items-center gap-2 font-bold text-white group-hover:gap-4 transition-all">
              Ir al módulo <ArrowRight size={20} />
            </div>
          </div> {/* <--- AQUÍ ESTABA EL </div> FALTANTE */}
        </Link>

        {/* Módulo: Ventas */}
        <Link href="/kore/ventas" className="group block p-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl text-white shadow-xl shadow-orange-500/20 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 opacity-20 group-hover:scale-125 transition-transform duration-500">
            <ShoppingCart size={140} />
          </div>
          <div className="relative z-10">
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/30">
              <ShoppingCart size={28} />
            </div>
            <h3 className="text-2xl font-black mb-2">Ventas</h3>
            <p className="text-orange-100 mb-8 max-w-[80%]">Registra transacciones, anula pedidos y actualiza el stock automáticamente.</p>
            <div className="flex items-center gap-2 font-bold text-white group-hover:gap-4 transition-all">
              Ir al módulo <ArrowRight size={20} />
            </div>
          </div>
        </Link>

      </div>
    </main>
  );
}