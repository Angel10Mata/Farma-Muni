"use client";

import React from "react";
import Link from "next/link";
// Agregamos ShoppingCart a nuestros iconos
import { PackagePlus, UserPlus, ShoppingCart, ArrowRight } from "lucide-react";

export function Dashboard() {
  return (
    <div className="space-y-6 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tighter text-foreground">
          Panel de Control
        </h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido a la gestión de tu organización.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* --- TARJETA 1: NUEVO PRODUCTO (Azul/Púrpura) --- */}
        <Link 
          href="/kore/productos" 
          className="group relative h-32 rounded-xl overflow-hidden border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-500/50 hover:-translate-y-1 flex flex-col justify-center p-5 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all duration-500" />

          <div className="relative z-10 flex items-center justify-between w-full h-full">
            <div className="flex flex-col justify-between h-full">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                <PackagePlus size={22} />
              </div>
              <span className="font-semibold text-foreground tracking-tight mt-3">
                Nuevo Artículo
              </span>
            </div>
            <div className="self-end mb-1">
              <ArrowRight size={20} className="text-muted-foreground opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-blue-400 transition-all duration-300" />
            </div>
          </div>
        </Link>

        {/* --- TARJETA 2: NUEVO CLIENTE (Esmeralda/Teal) --- */}
        <Link 
          href="/kore/clientes" 
          className="group relative h-32 rounded-xl overflow-hidden border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-500/50 hover:-translate-y-1 flex flex-col justify-center p-5 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all duration-500" />

          <div className="relative z-10 flex items-center justify-between w-full h-full">
            <div className="flex flex-col justify-between h-full">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                <UserPlus size={22} />
              </div>
              <span className="font-semibold text-foreground tracking-tight mt-3">
                Nuevo Cliente
              </span>
            </div>
            <div className="self-end mb-1">
              <ArrowRight size={20} className="text-muted-foreground opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-emerald-400 transition-all duration-300" />
            </div>
          </div>
        </Link>

        {/* --- TARJETA 3: NUEVA VENTA (Ámbar/Naranja) --- */}
        <Link 
          href="/kore/ventas" 
          className="group relative h-32 rounded-xl overflow-hidden border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-amber-500/50 hover:-translate-y-1 flex flex-col justify-center p-5 cursor-pointer"
        >
          {/* Gradiente de fondo Ámbar */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Luz decorativa Ámbar */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-all duration-500" />

          <div className="relative z-10 flex items-center justify-between w-full h-full">
            <div className="flex flex-col justify-between h-full">
              {/* Icono ShoppingCart con colores Ámbar */}
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                <ShoppingCart size={22} />
              </div>
              
              {/* Texto */}
              <span className="font-semibold text-foreground tracking-tight mt-3">
                Nueva Venta
              </span>
            </div>
            
            {/* Flecha con color Ámbar al hacer hover */}
            <div className="self-end mb-1">
              <ArrowRight 
                size={20} 
                className="text-muted-foreground opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-amber-500 transition-all duration-300" 
              />
            </div>
          </div>
        </Link>

        {/* Cuadro restante vacío (El 4to espacio de la cuadrícula) */}
        <div className="h-32 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm" />
        
      </div>
    </div>
  );
}