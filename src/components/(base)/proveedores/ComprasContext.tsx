"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { ItemCarritoCompra, Proveedor, Producto } from "./lib/zod";

interface ComprasContextProps {
  // Tabs y Modal
  activeTab: "compras" | "historial" | "proveedores" | "cuentas_por_pagar";
  setActiveTab: (tab: "compras" | "historial" | "proveedores" | "cuentas_por_pagar") => void;

  // Modales
  isCrearOpen: boolean;
  setIsCrearOpen: (val: boolean) => void;
  isEditarOpen: boolean;
  setIsEditarOpen: (val: boolean) => void;
  proveedorAEditar: Proveedor | null;
  setProveedorAEditar: (val: Proveedor | null) => void;
  proveedorSeleccionadoTab3: Proveedor | null;
  setProveedorSeleccionadoTab3: (val: Proveedor | null) => void;
  modoEdicionProveedor: boolean;
  setModoEdicionProveedor: (val: boolean) => void;

  // Carrito de compras
  carrito: ItemCarritoCompra[];
  setCarrito: React.Dispatch<React.SetStateAction<ItemCarritoCompra[]>>;
  proveedorSeleccionado: Proveedor | null;
  setProveedorSeleccionado: React.Dispatch<React.SetStateAction<Proveedor | null>>;
  proveedorBusqueda: string;
  setProveedorBusqueda: (val: string) => void;
  mostrarSugerenciasProv: boolean;
  setMostrarSugerenciasProv: (val: boolean) => void;
  proveedorAutoSeleccionado: boolean;
  setProveedorAutoSeleccionado: (val: boolean) => void;

  productoSeleccionado: Producto | null;
  setProductoSeleccionado: React.Dispatch<React.SetStateAction<Producto | null>>;
  productoBusqueda: string;
  setProductoBusqueda: (val: string) => void;
  mostrarSugerenciasProd: boolean;
  setMostrarSugerenciasProd: (val: boolean) => void;
  cantSeleccionada: number | "";
  setCantSeleccionada: (val: number | "") => void;
  costoSeleccionado: number | "";
  setCostoSeleccionado: (val: number | "") => void;

  // Datos orden
  estadoPago: "Pendiente" | "Pagado";
  setEstadoPago: (val: "Pendiente" | "Pagado") => void;
  observaciones: string;
  setObservaciones: (val: string) => void;
  isProcesando: boolean;
  setIsProcesando: (val: boolean) => void;

  // Helper functions
  agregarAlCarrito: (item: ItemCarritoCompra) => void;
  removerDelCarrito: (index: number) => void;
  limpiarCarrito: () => void;
}

const ComprasContext = createContext<ComprasContextProps | undefined>(undefined);

export function ComprasProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<"compras" | "historial" | "proveedores" | "cuentas_por_pagar">("compras");

  const [isCrearOpen, setIsCrearOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [proveedorAEditar, setProveedorAEditar] = useState<Proveedor | null>(null);
  const [proveedorSeleccionadoTab3, setProveedorSeleccionadoTab3] = useState<Proveedor | null>(null);
  const [modoEdicionProveedor, setModoEdicionProveedor] = useState(false);

  const [carrito, setCarrito] = useState<ItemCarritoCompra[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [mostrarSugerenciasProv, setMostrarSugerenciasProv] = useState(false);
  const [proveedorAutoSeleccionado, setProveedorAutoSeleccionado] = useState(false);

  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const [mostrarSugerenciasProd, setMostrarSugerenciasProd] = useState(false);
  const [cantSeleccionada, setCantSeleccionada] = useState<number | "">(1);
  const [costoSeleccionado, setCostoSeleccionado] = useState<number | "">("");

  const [estadoPago, setEstadoPago] = useState<"Pendiente" | "Pagado">("Pagado");
  const [observaciones, setObservaciones] = useState("");
  const [isProcesando, setIsProcesando] = useState(false);

  const agregarAlCarrito = (item: ItemCarritoCompra) => {
    setCarrito((prev) => {
      const exists = prev.findIndex((p) => p.producto.id === item.producto.id && p.precio_costo === item.precio_costo);
      if (exists !== -1) {
        const copy = [...prev];
        copy[exists].cantidad += item.cantidad;
        copy[exists].subtotal = copy[exists].cantidad * copy[exists].precio_costo;
        return copy;
      }
      return [...prev, item];
    });
  };

  const removerDelCarrito = (index: number) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setProveedorSeleccionado(null);
    setProveedorBusqueda("");
    setProveedorAutoSeleccionado(false);
    setObservaciones("");
    setEstadoPago("Pagado");
  };

  return (
    <ComprasContext.Provider
      value={{
        activeTab, setActiveTab,
        isCrearOpen, setIsCrearOpen,
        isEditarOpen, setIsEditarOpen,
        proveedorAEditar, setProveedorAEditar,
        proveedorSeleccionadoTab3, setProveedorSeleccionadoTab3,
        modoEdicionProveedor, setModoEdicionProveedor,
        carrito, setCarrito,
        proveedorSeleccionado, setProveedorSeleccionado,
        proveedorBusqueda, setProveedorBusqueda,
        mostrarSugerenciasProv, setMostrarSugerenciasProv,
        proveedorAutoSeleccionado, setProveedorAutoSeleccionado,
        productoSeleccionado, setProductoSeleccionado,
        productoBusqueda, setProductoBusqueda,
        mostrarSugerenciasProd, setMostrarSugerenciasProd,
        cantSeleccionada, setCantSeleccionada,
        costoSeleccionado, setCostoSeleccionado,
        estadoPago, setEstadoPago,
        observaciones, setObservaciones,
        isProcesando, setIsProcesando,
        agregarAlCarrito, removerDelCarrito, limpiarCarrito
      }}
    >
      {children}
    </ComprasContext.Provider>
  );
}

export function useCompras() {
  const context = useContext(ComprasContext);
  if (context === undefined) {
    throw new Error("useCompras must be used within a ComprasProvider");
  }
  return context;
}
