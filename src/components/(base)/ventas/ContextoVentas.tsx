"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Producto, Cliente, ItemCarrito, Venta } from "./lib/zod";
import Swal from "sweetalert2";
import { toast } from "@/components/ui/general-modal";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { ItemVentaInput, crearVenta } from "./lib/actions";
import { getSwalThemeOpts } from "@/lib/utils";

interface VentasContextType {
  // Tabs
  activeTab: "pos" | "historial";
  setActiveTab: (val: "pos" | "historial") => void;

  // Estado POS
  carrito: ItemCarrito[];
  setCarrito: React.Dispatch<React.SetStateAction<ItemCarrito[]>>;
  productoBusqueda: string;
  setProductoBusqueda: React.Dispatch<React.SetStateAction<string>>;
  productoSeleccionado: Producto | null;
  setProductoSeleccionado: React.Dispatch<React.SetStateAction<Producto | null>>;
  cantSeleccionada: number | "";
  setCantSeleccionada: React.Dispatch<React.SetStateAction<number | "">>;
  mostrarSugerenciasProd: boolean;
  setMostrarSugerenciasProd: React.Dispatch<React.SetStateAction<boolean>>;
  imagenAmpliadaUrl: string | null;
  setImagenAmpliadaUrl: React.Dispatch<React.SetStateAction<string | null>>;

  // Clientes POS
  clienteBusqueda: string;
  setClienteBusqueda: React.Dispatch<React.SetStateAction<string>>;
  clienteSeleccionado: Cliente | null;
  setClienteSeleccionado: React.Dispatch<React.SetStateAction<Cliente | null>>;
  mostrarSugerenciasCli: boolean;
  setMostrarSugerenciasCli: React.Dispatch<React.SetStateAction<boolean>>;
  isCrearClienteOpen: boolean;
  setIsCrearClienteOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Cobro
  tipoVenta: "Contado" | "Crédito";
  setTipoVenta: React.Dispatch<React.SetStateAction<"Contado" | "Crédito">>;
  mostrarMetodoPagoDropdown: boolean;
  setMostrarMetodoPagoDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  observaciones: string;
  setObservaciones: React.Dispatch<React.SetStateAction<string>>;
  isProcesandoVenta: boolean;
  setIsProcesandoVenta: React.Dispatch<React.SetStateAction<boolean>>;
  showUbicacionModal: boolean;
  setShowUbicacionModal: React.Dispatch<React.SetStateAction<boolean>>;

  // Edición de Carrito
  editingCartItemIndex: number | null;
  setEditingCartItemIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editingPrice: string;
  setEditingPrice: React.Dispatch<React.SetStateAction<string>>;
  editingQty: string;
  setEditingQty: React.Dispatch<React.SetStateAction<string>>;
  animateCart: boolean;
  setAnimateCart: React.Dispatch<React.SetStateAction<boolean>>;

  // Refs para Dropdowns (opcional si se manejan localmente, pero si se necesitan globales se pueden pasar o aislar)
  
  // Impresión y Modales
  ticketParaImprimir: any;
  setTicketParaImprimir: React.Dispatch<React.SetStateAction<any>>;
  reciboCaptura: any;
  setReciboCaptura: React.Dispatch<React.SetStateAction<any>>;
  reciboModalData: any;
  setReciboModalData: React.Dispatch<React.SetStateAction<any>>;

  // Handlers Globales
  handleAgregarAlCarrito: (productoOverride?: Producto, cantOverride?: number) => void;
  handleAjustarCantidad: (index: number, delta: number) => void;
  handleEliminarDelCarrito: (index: number) => void;
  handleFinalizarVenta: () => void;
  ejecutarCobro: () => void;
  totalCarrito: number;
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

export function VentasProvider({ children, productos, clientes, refetchDatos }: { children: ReactNode, productos: Producto[], clientes: Cliente[], refetchDatos: () => void }) {
  const { isDemoMode } = useDemoMode();
  const [activeTab, setActiveTab] = useState<"pos" | "historial">("pos");

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantSeleccionada, setCantSeleccionada] = useState<number | "">(1);
  const [mostrarSugerenciasProd, setMostrarSugerenciasProd] = useState(false);
  const [imagenAmpliadaUrl, setImagenAmpliadaUrl] = useState<string | null>(null);

  const [clienteBusqueda, setClienteBusqueda] = useState("Consumidor Final");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [mostrarSugerenciasCli, setMostrarSugerenciasCli] = useState(false);
  const [isCrearClienteOpen, setIsCrearClienteOpen] = useState(false);

  const [tipoVenta, setTipoVenta] = useState<"Contado" | "Crédito">("Contado");
  const [mostrarMetodoPagoDropdown, setMostrarMetodoPagoDropdown] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [isProcesandoVenta, setIsProcesandoVenta] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);

  const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [editingQty, setEditingQty] = useState<string>("");
  const [animateCart, setAnimateCart] = useState(false);

  const [ticketParaImprimir, setTicketParaImprimir] = useState<any>(null);
  const [reciboCaptura, setReciboCaptura] = useState<any>(null);
  const [reciboModalData, setReciboModalData] = useState<any>(null);

  // Evitar venta al crédito sin cliente
  useEffect(() => {
    if (!clienteSeleccionado && tipoVenta === "Crédito") {
      setTipoVenta("Contado");
    }
  }, [clienteSeleccionado, tipoVenta]);

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  const handleAgregarAlCarrito = (productoOverride?: Producto, cantOverride?: number) => {
    const prod = productoOverride || productoSeleccionado;
    if (!prod) return;
    
    const cant = cantOverride !== undefined ? cantOverride : (Number(cantSeleccionada) || 0);
    if (cant <= 0) return;
    
    setCarrito(prev => {
      const itemExistente = prev.find((i) => i.producto.id === prod.id);
      const cantidadFinal = (itemExistente?.cantidad || 0) + cant;

      if (cantidadFinal > prod.stock_actual) {
        toast.warn(`Stock insuficiente. Disponibles: ${prod.stock_actual}.`);
        return prev;
      }

      if (itemExistente) {
        return prev.map((i) =>
          i.producto.id === prod.id
            ? { ...i, cantidad: cantidadFinal, subtotal: cantidadFinal * i.precio_aplicado }
            : i
        );
      } else {
        return [
          ...prev,
          { producto: prod, cantidad: cant, precio_aplicado: prod.precio_base, subtotal: cant * prod.precio_base }
        ];
      }
    });

    setAnimateCart(true);
    setTimeout(() => setAnimateCart(false), 500);

    toast.success(`Se añadió ${prod.nombre}`);

    setProductoSeleccionado(null);
    setProductoBusqueda("");
    setCantSeleccionada(1);
    setMostrarSugerenciasProd(false);
  };

  const handleAjustarCantidad = (index: number, delta: number) => {
    const item = carrito[index];
    const nuevaCant = item.cantidad + delta;

    if (nuevaCant <= 0) {
      handleEliminarDelCarrito(index);
      return;
    }

    if (nuevaCant > item.producto.stock_actual) {
      toast.warn(`Solo hay ${item.producto.stock_actual} unidades disponibles.`);
      return;
    }

    setCarrito(carrito.map((i, idx) =>
      idx === index
        ? { ...i, cantidad: nuevaCant, subtotal: nuevaCant * i.precio_aplicado }
        : i
    ));
  };

  const handleEliminarDelCarrito = async (index: number) => {
    const item = carrito[index];
    const confirm = await Swal.fire({
      title: "¿Eliminar del carrito?",
      text: `¿Deseas eliminar "${item.producto.nombre}" de la venta?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts()
    });

    if (confirm.isConfirmed) {
      setCarrito(carrito.filter((_, idx) => idx !== index));
    }
  };

  const handleFinalizarVenta = async () => {
    if (carrito.length === 0) {
      toast.warn("Agrega productos a la venta antes de cobrar.");
      return;
    }

    if (tipoVenta === "Crédito" && !clienteSeleccionado) {
      toast.warn("Para venta al crédito debes seleccionar un cliente.");
      return;
    }

    const hasModifiedPrices = carrito.some(item => item.precio_aplicado !== item.producto.precio_base);
    if (hasModifiedPrices && !observaciones.trim()) {
      toast.warn("Escribe una observación cuando modificas precios.");
      return;
    }

    const resConfirm = await Swal.fire({
      title: "¿Confirmar cobro?",
      text: `Se registrará la venta por un total de Q${totalCarrito.toFixed(2)} (${tipoVenta}).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, registrar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts()
    });

    if (!resConfirm.isConfirmed) return;

    setShowUbicacionModal(true);
  };

  const ejecutarCobro = async () => {
    setShowUbicacionModal(false);
    setIsProcesandoVenta(true);
    try {
      if (isDemoMode) {
        const ventaObj: Venta = {
          id: "demo-venta-preview",
          created_at: new Date().toISOString(),
          numero_recibo: 9001,
          cliente_id: clienteSeleccionado?.id || null,
          usuario_id: "",
          tipo_venta: tipoVenta,
          total: totalCarrito,
          observaciones: observaciones.trim() || null,
          ven_clientes: clienteSeleccionado
            ? { nombre: clienteSeleccionado.nombre, nit: clienteSeleccionado.nit }
            : null,
        };
        const freshDetails = carrito.map((i) => ({
          cantidad: i.cantidad,
          precio_aplicado: i.precio_aplicado,
          subtotal: i.subtotal,
          inv_productos: { nombre: i.producto.nombre, codigo: i.producto.codigo },
        }));
        const clientSave = clienteSeleccionado;
        setCarrito([]);
        setClienteSeleccionado(null);
        setClienteBusqueda("Consumidor Final");
        setObservaciones("");
        setReciboModalData({
          venta: ventaObj,
          detalles: freshDetails,
          clienteCompleto: clientSave,
        });
        toast.info("Venta simulada — no se guardó en la base de datos.");
        return;
      }

      const itemsFormatted: ItemVentaInput[] = carrito.map((i) => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
        precio_aplicado: i.precio_aplicado,
        subtotal: i.subtotal
      }));

      const res = await crearVenta({
        cliente_id: clienteSeleccionado?.id || null,
        tipo_venta: tipoVenta,
        total: totalCarrito,
        observaciones: observaciones.trim() || null,
        items: itemsFormatted
      });

      if (!res.success) {
        throw new Error(res.error);
      }

      const ventaObj: Venta = {
        id: res.venta_id!,
        created_at: new Date().toISOString(),
        numero_recibo: res.numero_recibo!,
        cliente_id: clienteSeleccionado?.id || null,
        usuario_id: "",
        tipo_venta: tipoVenta,
        total: totalCarrito,
        observaciones: observaciones.trim() || null,
        ven_clientes: clienteSeleccionado ? { nombre: clienteSeleccionado.nombre, nit: clienteSeleccionado.nit } : null
      };

      const freshDetails = carrito.map((i) => ({
        cantidad: i.cantidad,
        precio_aplicado: i.precio_aplicado,
        subtotal: i.subtotal,
        inv_productos: { nombre: i.producto.nombre, codigo: i.producto.codigo }
      }));

      refetchDatos();
      const clientSave = clienteSeleccionado;

      setCarrito([]);
      setClienteSeleccionado(null);
      setClienteBusqueda("Consumidor Final");
      setObservaciones("");

      setReciboModalData({
        venta: ventaObj,
        detalles: freshDetails,
        clienteCompleto: clientSave
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo completar el cobro.";
      toast.error(message);
    } finally {
      setIsProcesandoVenta(false);
    }
  };

  return (
    <VentasContext.Provider value={{
      activeTab, setActiveTab,
      carrito, setCarrito,
      productoBusqueda, setProductoBusqueda,
      productoSeleccionado, setProductoSeleccionado,
      cantSeleccionada, setCantSeleccionada,
      mostrarSugerenciasProd, setMostrarSugerenciasProd,
      imagenAmpliadaUrl, setImagenAmpliadaUrl,
      clienteBusqueda, setClienteBusqueda,
      clienteSeleccionado, setClienteSeleccionado,
      mostrarSugerenciasCli, setMostrarSugerenciasCli,
      isCrearClienteOpen, setIsCrearClienteOpen,
      tipoVenta, setTipoVenta,
      mostrarMetodoPagoDropdown, setMostrarMetodoPagoDropdown,
      observaciones, setObservaciones,
      isProcesandoVenta, setIsProcesandoVenta,
      showUbicacionModal, setShowUbicacionModal,
      editingCartItemIndex, setEditingCartItemIndex,
      editingPrice, setEditingPrice,
      editingQty, setEditingQty,
      animateCart, setAnimateCart,
      ticketParaImprimir, setTicketParaImprimir,
      reciboCaptura, setReciboCaptura,
      reciboModalData, setReciboModalData,
      handleAgregarAlCarrito,
      handleAjustarCantidad,
      handleEliminarDelCarrito,
      handleFinalizarVenta,
      ejecutarCobro,
      totalCarrito
    }}>
      {children}
    </VentasContext.Provider>
  );
}

export const useVentas = () => {
  const context = useContext(VentasContext);
  if (!context) throw new Error("useVentas must be used within a VentasProvider");
  return context;
};
