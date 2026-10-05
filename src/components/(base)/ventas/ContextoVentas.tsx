"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from "react";
import { Producto, Cliente, ItemCarrito, Venta } from "./lib/zod";
import Swal from "sweetalert2";
import { toast } from "@/components/ui/general-modal";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import {
  ItemVentaInput,
  autorizarRebajaConCredencialesAdmin,
  crearSolicitudRebaja,
  crearVenta,
  resolverLoteParaProducto,
} from "./lib/actions";
import { buildSolicitudRebajaPayload, carritoTieneRebajas, validarCarritoPrecioCosto } from "./lib/helpers";
import { useEstadoSolicitudRebaja } from "./lib/hooks";
import { getSwalThemeOpts } from "@/lib/utils";

// Estado compartido del punto de venta
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

  // Recibos e impresión
  ticketParaImprimir: any;
  setTicketParaImprimir: React.Dispatch<React.SetStateAction<any>>;
  reciboCaptura: any;
  setReciboCaptura: React.Dispatch<React.SetStateAction<any>>;
  reciboModalData: any;
  setReciboModalData: React.Dispatch<React.SetStateAction<any>>;

  // Acciones del carrito y cobro
  handleAgregarAlCarrito: (
    productoOverride?: Producto,
    cantOverride?: number,
    loteMeta?: {
      lote_id: string;
      codigo_barras_lote: string;
      stock_lote: number;
      precio_costo_lote: number;
    },
  ) => Promise<void>;
  handleAjustarCantidad: (index: number, delta: number) => void;
  handleEliminarDelCarrito: (index: number) => void;
  handleFinalizarVenta: () => void;
  ejecutarCobro: () => void;
  totalCarrito: number;

  // Rebajas (espera de admin)
  esperandoAutorizacionRebaja: boolean;
  rebajaAutorizada: boolean;
  showModalAutorizacionRebaja: boolean;
  setShowModalAutorizacionRebaja: React.Dispatch<React.SetStateAction<boolean>>;
  confirmarRebajaConAdmin: (usuario: string, clave: string) => Promise<void>;
  isValidandoAutorizacionRebaja: boolean;
  abrirAutorizacionRebajaDesdeNotificacion: (solicitudId: string) => void;
  restaurarEsperaRebaja: (solicitudId: string) => void;
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

// Proveedor del punto de venta
export function VentasProvider({ children, productos, clientes, refetchDatos }: { children: ReactNode, productos: Producto[], clientes: Cliente[], refetchDatos: () => void }) {
  const { isDemoMode } = useDemoMode();
  const { realRole, simulatedRole } = useUserContext();

  // Tabs
  const [activeTab, setActiveTab] = useState<"pos" | "historial">("pos");

  // Estado POS
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantSeleccionada, setCantSeleccionada] = useState<number | "">(1);
  const [mostrarSugerenciasProd, setMostrarSugerenciasProd] = useState(false);
  const [imagenAmpliadaUrl, setImagenAmpliadaUrl] = useState<string | null>(null);

  // Clientes POS
  const [clienteBusqueda, setClienteBusqueda] = useState("Consumidor Final");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [mostrarSugerenciasCli, setMostrarSugerenciasCli] = useState(false);
  const [isCrearClienteOpen, setIsCrearClienteOpen] = useState(false);

  // Cobro
  const [tipoVenta, setTipoVenta] = useState<"Contado" | "Crédito">("Contado");
  const [mostrarMetodoPagoDropdown, setMostrarMetodoPagoDropdown] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [isProcesandoVenta, setIsProcesandoVenta] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);

  // Edición de carrito
  const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [editingQty, setEditingQty] = useState<string>("");
  const [animateCart, setAnimateCart] = useState(false);

  // Recibos e impresión
  const [ticketParaImprimir, setTicketParaImprimir] = useState<any>(null);
  const [reciboCaptura, setReciboCaptura] = useState<any>(null);
  const [reciboModalData, setReciboModalData] = useState<any>(null);

  // Rebajas (espera de admin)
  const [solicitudRebajaId, setSolicitudRebajaId] = useState<string | null>(null);
  const [esperandoAutorizacionRebaja, setEsperandoAutorizacionRebaja] = useState(false);
  const [rebajaAutorizada, setRebajaAutorizada] = useState(false);
  const [showModalAutorizacionRebaja, setShowModalAutorizacionRebaja] = useState(false);
  const [isValidandoAutorizacionRebaja, setIsValidandoAutorizacionRebaja] = useState(false);
  const carritoSnapshotRef = useRef<string>("");

  const limpiarFlujoRebaja = () => {
    setSolicitudRebajaId(null);
    setEsperandoAutorizacionRebaja(false);
    setRebajaAutorizada(false);
    setShowModalAutorizacionRebaja(false);
    carritoSnapshotRef.current = "";
  };

  const confirmarRebajaConAdmin = async (usuario: string, clave: string) => {
    if (!solicitudRebajaId) {
      toast.error("No hay solicitud de rebaja activa.");
      return;
    }
    setIsValidandoAutorizacionRebaja(true);
    try {
      const res = await autorizarRebajaConCredencialesAdmin(
        solicitudRebajaId,
        usuario,
        clave,
      );
      if (!res.success) {
        throw new Error(res.error);
      }
      if (esperandoAutorizacionRebaja) {
        setRebajaAutorizada(true);
        toast.success("Rebaja autorizada. Pulsa Cobrar de nuevo para registrar la venta.");
      } else {
        toast.success("Rebaja autorizada para el vendedor.");
      }
      setShowModalAutorizacionRebaja(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo autorizar la rebaja.";
      toast.error(message);
    } finally {
      setIsValidandoAutorizacionRebaja(false);
    }
  };

  const abrirAutorizacionRebajaDesdeNotificacion = useCallback((id: string) => {
    setSolicitudRebajaId(id);
    setShowModalAutorizacionRebaja(true);
  }, []);

  const restaurarEsperaRebaja = useCallback((id: string) => {
    setSolicitudRebajaId(id);
    setEsperandoAutorizacionRebaja(true);
    setRebajaAutorizada(false);
  }, []);

  const { data: solicitudRebajaRemota } = useEstadoSolicitudRebaja(
    esperandoAutorizacionRebaja && solicitudRebajaId ? solicitudRebajaId : null,
  );

  // Respuesta del admin a la rebaja
  useEffect(() => {
    if (!solicitudRebajaRemota || !esperandoAutorizacionRebaja) return;

    if (solicitudRebajaRemota.estado === "aprobada" && !rebajaAutorizada) {
      setRebajaAutorizada(true);
      setShowModalAutorizacionRebaja(false);
      toast.success("Rebaja autorizada. Pulsa Cobrar de nuevo para registrar la venta.");
    }
    if (solicitudRebajaRemota.estado === "rechazada") {
      const motivo =
        typeof solicitudRebajaRemota.motivo_rechazo === "string"
          ? solicitudRebajaRemota.motivo_rechazo
          : null;
      limpiarFlujoRebaja();
      toast.error(motivo?.trim() || "La rebaja fue rechazada por administración.");
    }
  }, [solicitudRebajaRemota, esperandoAutorizacionRebaja, rebajaAutorizada]);

  // Si cambia el carrito, hay que pedir rebaja otra vez
  useEffect(() => {
    if (!esperandoAutorizacionRebaja || rebajaAutorizada) return;
    const snapshot = JSON.stringify(
      carrito.map((i) => ({
        id: i.producto.id,
        c: i.cantidad,
        p: i.precio_aplicado,
      })),
    );
    if (!carritoSnapshotRef.current) {
      carritoSnapshotRef.current = snapshot;
      return;
    }
    if (carritoSnapshotRef.current !== snapshot) {
      limpiarFlujoRebaja();
      toast.warn("Modificaste el carrito; debes solicitar autorización de nuevo.");
    }
  }, [carrito, esperandoAutorizacionRebaja, rebajaAutorizada]);

  // Crédito solo con cliente elegido
  useEffect(() => {
    if (!clienteSeleccionado && tipoVenta === "Crédito") {
      setTipoVenta("Contado");
    }
  }, [clienteSeleccionado, tipoVenta]);

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // Acciones del carrito y cobro
  const handleAgregarAlCarrito = async (
    productoOverride?: Producto,
    cantOverride?: number,
    loteMeta?: {
      lote_id: string;
      codigo_barras_lote: string;
      stock_lote: number;
      precio_costo_lote: number;
    },
  ) => {
    const prod = productoOverride || productoSeleccionado;
    if (!prod) return;

    const cant = cantOverride !== undefined ? cantOverride : Number(cantSeleccionada) || 0;
    if (cant <= 0) return;

    let lote = loteMeta;
    if (!lote && !isDemoMode) {
      const res = await resolverLoteParaProducto(prod.id, cant);
      if (res.success) {
        lote = {
          lote_id: res.lote_id,
          codigo_barras_lote: res.codigo_barras,
          stock_lote: res.stock_lote,
          precio_costo_lote: res.precio_costo,
        };
      }
    }

    const stockMax = lote?.stock_lote ?? prod.stock_actual;
    const loteId = lote?.lote_id;

    setCarrito((prev) => {
      const itemExistente = prev.find(
        (i) => i.producto.id === prod.id && (i.lote_id ?? null) === (loteId ?? null),
      );
      const cantidadFinal = (itemExistente?.cantidad || 0) + cant;

      if (cantidadFinal > stockMax) {
        toast.warn(`Stock insuficiente. Disponibles: ${stockMax}.`);
        return prev;
      }

      if (itemExistente) {
        return prev.map((i) =>
          i.producto.id === prod.id && (i.lote_id ?? null) === (loteId ?? null)
            ? { ...i, cantidad: cantidadFinal, subtotal: cantidadFinal * i.precio_aplicado }
            : i,
        );
      }
      return [
        ...prev,
        {
          producto: prod,
          lote_id: loteId,
          codigo_barras_lote: lote?.codigo_barras_lote,
          stock_lote: lote?.stock_lote,
          precio_costo_lote: lote?.precio_costo_lote,
          cantidad: cant,
          precio_aplicado: prod.precio_base,
          subtotal: cant * prod.precio_base,
        },
      ];
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

    const stockMax = item.stock_lote ?? item.producto.stock_actual;
    if (nuevaCant > stockMax) {
      toast.warn(`Solo hay ${stockMax} unidades disponibles.`);
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

    const errorCosto = validarCarritoPrecioCosto(carrito);
    if (errorCosto) {
      toast.warn(errorCosto);
      return;
    }

    if (tipoVenta === "Crédito" && !clienteSeleccionado) {
      toast.warn("Para venta al crédito debes seleccionar un cliente.");
      return;
    }

    const hasModifiedPrices = carritoTieneRebajas(carrito);
    if (hasModifiedPrices && !observaciones.trim()) {
      toast.warn("Escribe una observación cuando aplicas una rebaja.");
      return;
    }

    const resConfirm = await Swal.fire({
      title: "¿Confirmar cobro?",
      text: `Se registrará la venta por un total de Q${totalCarrito.toFixed(2)} (${tipoVenta}).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, continuar",
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
      const errorCosto = validarCarritoPrecioCosto(carrito);
      if (errorCosto) {
        toast.warn(errorCosto);
        return;
      }

      const hasModifiedPrices = carritoTieneRebajas(carrito);
      if (hasModifiedPrices && !observaciones.trim()) {
        toast.warn("Escribe una observación cuando aplicas una rebaja.");
        return;
      }

      const omiteAutorizacionRebaja =
        ["admin", "super"].includes(realRole) && simulatedRole === null;
      const requiereAutorizacionRemota =
        hasModifiedPrices && !omiteAutorizacionRebaja && !isDemoMode;

      if (requiereAutorizacionRemota) {
        if (esperandoAutorizacionRebaja && !rebajaAutorizada) {
          toast.warn(
            "Sigue en espera de confirmación administrativa. Un admin debe autorizar la rebaja.",
          );
          setShowModalAutorizacionRebaja(true);
          return;
        }

        if (!rebajaAutorizada) {
          const payload = buildSolicitudRebajaPayload({
            carrito,
            cliente_id: clienteSeleccionado?.id ?? null,
            tipo_venta: tipoVenta,
            total: totalCarrito,
            observaciones: observaciones.trim() || null,
          });
          const res = await crearSolicitudRebaja(payload);
          if (!res.success) {
            throw new Error(res.error);
          }
          setSolicitudRebajaId(res.solicitud_id);
          setEsperandoAutorizacionRebaja(true);
          setRebajaAutorizada(false);
          carritoSnapshotRef.current = JSON.stringify(
            carrito.map((i) => ({
              id: i.producto.id,
              c: i.cantidad,
              p: i.precio_aplicado,
            })),
          );
          toast.warn(
            "Se notificó a administración. Espera confirmación o pide a un admin que autorice en Ventas.",
          );
          setShowModalAutorizacionRebaja(true);
          return;
        }
      }

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
          inv_productos: {
            nombre: i.producto.nombre,
            codigo: i.codigo_barras_lote ?? i.producto.codigo ?? "",
          },
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
        lote_id: i.lote_id ?? null,
        cantidad: i.cantidad,
        precio_aplicado: i.precio_aplicado,
        subtotal: i.subtotal,
      }));

      const res = await crearVenta({
        cliente_id: clienteSeleccionado?.id || null,
        tipo_venta: tipoVenta,
        total: totalCarrito,
        observaciones: observaciones.trim() || null,
        items: itemsFormatted,
        solicitud_rebaja_id:
          rebajaAutorizada && solicitudRebajaId ? solicitudRebajaId : undefined,
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
        inv_productos: {
          nombre: i.producto.nombre,
          codigo: i.codigo_barras_lote ?? i.producto.codigo ?? "",
        },
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
      limpiarFlujoRebaja();
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
      totalCarrito,
      esperandoAutorizacionRebaja,
      rebajaAutorizada,
      showModalAutorizacionRebaja,
      setShowModalAutorizacionRebaja,
      confirmarRebajaConAdmin,
      isValidandoAutorizacionRebaja,
      abrirAutorizacionRebajaDesdeNotificacion,
      restaurarEsperaRebaja,
    }}>
      {children}
    </VentasContext.Provider>
  );
}

// Acceder al contexto de ventas
export const useVentas = () => {
  const context = useContext(VentasContext);
  if (!context) throw new Error("useVentas must be used within a VentasProvider");
  return context;
};
