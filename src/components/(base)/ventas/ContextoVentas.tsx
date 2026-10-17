"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from "react";
import { ComercialVenta, GenericoVenta, Cliente, ItemCarrito, Venta } from "./lib/zod";
import Swal from "sweetalert2";
import { toast } from "@/components/ui/general-modal";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import {
  ItemVentaInput,
  autorizarRebajaConCredencialesAdmin,
  crearSolicitudRebaja,
  crearVenta,
  asignarLotes,
  consultarCreditoVencidoCliente,
  obtenerFarmaciaReciboSettings,
  type CreditoVencidoResumen,
} from "./lib/actions";
import {
  buildSolicitudRebajaPayload,
  buscarGenericoPorId,
  carritoRequiereReceta,
  carritoTieneRebajas,
  demoAsignarLotes,
  mensajeCreditoVencidoCliente,
  validarCarritoPrecioCosto,
} from "./lib/helpers";
import { mapCarritoToReciboItems } from "./ReciboVenta";
import type { LoteAsignadoVenta } from "./lib/lotes-venta";
import {
  refrescarQueriesRebajaVentas,
  useEstadoSolicitudRebaja,
} from "./lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { getSwalThemeOpts } from "@/lib/utils";
import {
  categoriaVencimientoLote,
  diasRestantesVencimientoGt,
} from "@/lib/vencimientos-gt";

// Estado compartido del punto de venta
interface VentasContextType {
  // Tabs
  activeTab: "pos" | "historial";
  setActiveTab: (val: "pos" | "historial") => void;

  // Estado POS
  carrito: ItemCarrito[];
  setCarrito: React.Dispatch<React.SetStateAction<ItemCarrito[]>>;
  genericoBusqueda: string;
  setGenericoBusqueda: React.Dispatch<React.SetStateAction<string>>;
  genericoSeleccionado: GenericoVenta | null;
  setGenericoSeleccionado: React.Dispatch<React.SetStateAction<GenericoVenta | null>>;
  comercialSeleccionado: ComercialVenta | null;
  setComercialSeleccionado: React.Dispatch<React.SetStateAction<ComercialVenta | null>>;
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
    comercialOverride?: ComercialVenta,
    genericoOverride?: GenericoVenta,
    cantOverride?: number,
    loteMeta?: {
      lote_id: string;
      codigo_barras_lote: string;
      stock_lote: number;
      precio_costo_lote: number;
      numero_lote?: string | null;
      cantidad?: number;
      fecha_vencimiento?: string | null;
    },
  ) => Promise<void>;
  handleAjustarCantidad: (index: number, delta: number) => void;
  handleAjustarCantidadGrupo: (indices: number[], delta: number) => void;
  handleEliminarDelCarrito: (index: number) => void;
  handleEliminarGrupoCarrito: (indices: number[]) => void;
  handleFinalizarVenta: () => void;
  ejecutarCobro: (solicitudRebajaAprobadaId?: string) => Promise<void>;
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

  advertenciaVencimientoPos: string | null;
  setAdvertenciaVencimientoPos: React.Dispatch<React.SetStateAction<string | null>>;

  creditoVencido: CreditoVencidoResumen | null;
  autorizarCreditoMoroso: boolean;
  setAutorizarCreditoMoroso: React.Dispatch<React.SetStateAction<boolean>>;
  recetaMedicoNombre: string;
  setRecetaMedicoNombre: React.Dispatch<React.SetStateAction<string>>;
  recetaColegiado: string;
  setRecetaColegiado: React.Dispatch<React.SetStateAction<string>>;
  recetaNumero: string;
  setRecetaNumero: React.Dispatch<React.SetStateAction<string>>;
  reciboFarmacia: { nombre: string; direccion: string; telefono: string } | null;
  ultimaVentaIncluyeReceta: boolean;
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

// Proveedor del punto de venta
type RefetchVentasDatos = ReturnType<
  typeof import("./lib/hooks").useDatosVentas
>["refetch"];

export function VentasProvider({
  children,
  genericos,
  comerciales,
  clientes,
  refetchDatos,
}: {
  children: ReactNode;
  genericos: GenericoVenta[];
  comerciales: ComercialVenta[];
  clientes: Cliente[];
  refetchDatos: RefetchVentasDatos;
}) {
  const { isDemoMode } = useDemoMode();
  const { user, realRole, simulatedRole } = useUserContext();

  // Tabs
  const [activeTab, setActiveTab] = useState<"pos" | "historial">("pos");

  // Estado POS
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [genericoBusqueda, setGenericoBusqueda] = useState("");
  const [genericoSeleccionado, setGenericoSeleccionado] = useState<GenericoVenta | null>(null);
  const [comercialSeleccionado, setComercialSeleccionado] = useState<ComercialVenta | null>(null);
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
  const [advertenciaVencimientoPos, setAdvertenciaVencimientoPos] = useState<string | null>(
    null,
  );
  const [creditoVencido, setCreditoVencido] = useState<CreditoVencidoResumen | null>(null);
  const [autorizarCreditoMoroso, setAutorizarCreditoMoroso] = useState(false);
  const [recetaMedicoNombre, setRecetaMedicoNombre] = useState("");
  const [recetaColegiado, setRecetaColegiado] = useState("");
  const [recetaNumero, setRecetaNumero] = useState("");
  const [reciboFarmacia, setReciboFarmacia] = useState<{
    nombre: string;
    direccion: string;
    telefono: string;
  } | null>(null);
  const [ultimaVentaIncluyeReceta, setUltimaVentaIncluyeReceta] = useState(false);

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
  const cobroPendienteTrasRebajaRef = useRef(false);
  const ejecutarCobroRef = useRef<
    ((solicitudRebajaAprobadaId?: string) => Promise<void>) | null
  >(null);
  const queryClient = useQueryClient();

  const limpiarFlujoRebaja = () => {
    setSolicitudRebajaId(null);
    setEsperandoAutorizacionRebaja(false);
    setRebajaAutorizada(false);
    setShowModalAutorizacionRebaja(false);
    carritoSnapshotRef.current = "";
    cobroPendienteTrasRebajaRef.current = false;
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
      await refrescarQueriesRebajaVentas(queryClient, solicitudRebajaId);
      if (esperandoAutorizacionRebaja) {
        setRebajaAutorizada(true);
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
        id: i.comercial.producto_id,
        l: i.lote_id ?? null,
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

  useEffect(() => {
    if (isDemoMode) return;
    void obtenerFarmaciaReciboSettings().then((f) => {
      if (f) setReciboFarmacia(f);
    });
  }, [isDemoMode]);

  useEffect(() => {
    setAutorizarCreditoMoroso(false);
    if (!clienteSeleccionado || isDemoMode) {
      setCreditoVencido(null);
      return;
    }
    void consultarCreditoVencidoCliente(clienteSeleccionado.id).then(setCreditoVencido);
  }, [clienteSeleccionado, isDemoMode]);

  // Crédito solo con cliente elegido
  useEffect(() => {
    if (!clienteSeleccionado && tipoVenta === "Crédito") {
      setTipoVenta("Contado");
    }
  }, [clienteSeleccionado, tipoVenta]);

  const esAdminSesion =
    ["admin", "super"].includes(realRole) && simulatedRole === null;

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // Acciones del carrito y cobro
  const handleAgregarAlCarrito = async (
    comercialOverride?: ComercialVenta,
    genericoOverride?: GenericoVenta,
    cantOverride?: number,
    loteMeta?: {
      lote_id: string;
      codigo_barras_lote: string;
      stock_lote: number;
      precio_costo_lote: number;
      numero_lote?: string | null;
      cantidad?: number;
      fecha_vencimiento?: string | null;
    },
  ) => {
    const comercial = comercialOverride || comercialSeleccionado;
    if (!comercial) return;

    const generico =
      genericoOverride ||
      buscarGenericoPorId(genericos, comercial.generico_id) ||
      genericoSeleccionado;
    if (!generico) return;

    const cant = cantOverride !== undefined ? cantOverride : Number(cantSeleccionada) || 0;
    if (cant <= 0) return;

    let asignaciones: LoteAsignadoVenta[] = [];

    if (loteMeta) {
      const cantLote = loteMeta.cantidad ?? cant;
      asignaciones = [
        {
          lote_id: loteMeta.lote_id,
          cantidad: cantLote,
          stock_lote: loteMeta.stock_lote,
          precio_venta: comercial.precio_venta,
          precio_costo: loteMeta.precio_costo_lote,
          codigo_barras: loteMeta.codigo_barras_lote,
          numero_lote: loteMeta.numero_lote ?? null,
          fecha_vencimiento: loteMeta.fecha_vencimiento ?? null,
        },
      ];
    } else if (isDemoMode) {
      const demo = demoAsignarLotes(comercial, cant);
      if (!demo) {
        toast.warn(`Stock insuficiente. Disponibles: ${comercial.stock_vendible}.`);
        return;
      }
      asignaciones = demo;
    } else {
      const res = await asignarLotes(comercial.producto_id, cant);
      if (!res.success) {
        toast.warn(res.error);
        return;
      }
      asignaciones = res.lotes;
    }

    let agregados = 0;
    setCarrito((prev) => {
      let next = [...prev];
      for (const a of asignaciones) {
        const itemExistente = next.find(
          (i) => i.comercial.producto_id === comercial.producto_id && i.lote_id === a.lote_id,
        );
        const cantidadFinal = (itemExistente?.cantidad || 0) + a.cantidad;
        const stockMax = itemExistente?.stock_lote ?? a.stock_lote;

        if (cantidadFinal > stockMax) {
          toast.warn(`Stock insuficiente en el lote. Disponibles: ${stockMax}.`);
          continue;
        }

        if (itemExistente) {
          next = next.map((i) =>
            i.lote_id === a.lote_id && i.comercial.producto_id === comercial.producto_id
              ? {
                  ...i,
                  cantidad: cantidadFinal,
                  subtotal: cantidadFinal * i.precio_aplicado,
                }
              : i,
          );
        } else {
          next.push({
            generico,
            comercial,
            lote_id: a.lote_id,
            codigo_barras_lote: a.codigo_barras,
            numero_lote: a.numero_lote,
            stock_lote: a.stock_lote,
            precio_costo_lote: a.precio_costo,
            precio_venta_referencia: comercial.precio_venta,
            laboratorio_nombre: comercial.laboratorio_nombre ?? undefined,
            cantidad: a.cantidad,
            precio_aplicado: comercial.precio_venta,
            subtotal: a.cantidad * comercial.precio_venta,
          });
        }
        agregados += a.cantidad;
      }
      return next;
    });

    if (agregados <= 0) return;

    const fefo = asignaciones[0];
    if (fefo?.fecha_vencimiento && categoriaVencimientoLote(fefo.fecha_vencimiento) === "dias_0_30") {
      const dias = diasRestantesVencimientoGt(fefo.fecha_vencimiento);
      setAdvertenciaVencimientoPos(
        `El lote asignado por FEFO vence en ${dias ?? "menos de 30"} días. La venta puede continuar.`,
      );
    } else {
      setAdvertenciaVencimientoPos(null);
    }

    setAnimateCart(true);
    setTimeout(() => setAnimateCart(false), 500);

    toast.success(`Se añadió ${comercial.nombre_comercial}`);

    setComercialSeleccionado(null);
    setGenericoSeleccionado(null);
    setGenericoBusqueda("");
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

    const stockMax = item.stock_lote ?? item.comercial.stock_vendible;
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
      text: `¿Deseas eliminar "${item.comercial.nombre_comercial}" de la venta?`,
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

  const handleEliminarGrupoCarrito = async (indices: number[]) => {
    if (indices.length === 0) return;
    const item = carrito[indices[0]];
    if (!item) return;
    const confirm = await Swal.fire({
      title: "¿Eliminar del carrito?",
      text: `¿Deseas eliminar "${item.comercial.nombre_comercial}" de la venta?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts(),
    });

    if (confirm.isConfirmed) {
      const quitar = new Set(indices);
      setCarrito(carrito.filter((_, idx) => !quitar.has(idx)));
    }
  };

  const handleAjustarCantidadGrupo = (indices: number[], delta: number) => {
    if (indices.length === 0 || delta === 0) return;

    if (indices.length === 1 && delta !== 0) {
      handleAjustarCantidad(indices[0], delta);
      return;
    }

    const ordenados = [...indices].sort((a, b) => a - b);

    if (delta > 0) {
      for (const idx of ordenados) {
        const item = carrito[idx];
        if (!item) continue;
        const stockMax = item.stock_lote ?? item.comercial.stock_vendible;
        if (item.cantidad < stockMax) {
          handleAjustarCantidad(idx, 1);
          return;
        }
      }
      const ref = carrito[ordenados[0]];
      if (ref) {
        void handleAgregarAlCarrito(ref.comercial, ref.generico, 1);
      }
      return;
    }

    let porQuitar = -delta;
    setCarrito((prev) => {
      const actualizados = new Map<number, ItemCarrito | null>();
      for (let k = ordenados.length - 1; k >= 0 && porQuitar > 0; k--) {
        const idx = ordenados[k];
        const item = prev[idx];
        if (!item) continue;
        const restar = Math.min(porQuitar, item.cantidad);
        porQuitar -= restar;
        const nuevaCant = item.cantidad - restar;
        if (nuevaCant <= 0) {
          actualizados.set(idx, null);
        } else {
          actualizados.set(idx, {
            ...item,
            cantidad: nuevaCant,
            subtotal: nuevaCant * item.precio_aplicado,
          });
        }
      }
      return prev.flatMap((item, idx) => {
        if (!actualizados.has(idx)) return [item];
        const next = actualizados.get(idx);
        return next ? [next] : [];
      });
    });
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

    if (
      tipoVenta === "Crédito" &&
      creditoVencido?.vencido &&
      (!esAdminSesion || !autorizarCreditoMoroso)
    ) {
      toast.warn(
        mensajeCreditoVencidoCliente(
          creditoVencido.total,
          creditoVencido.desde ?? "",
        ),
      );
      return;
    }

    if (carritoRequiereReceta(carrito)) {
      if (!recetaMedicoNombre.trim() || !recetaColegiado.trim()) {
        toast.warn(
          "Registra el nombre del médico y el número de colegiado antes de cobrar.",
        );
        return;
      }
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

  const ejecutarCobro = async (solicitudRebajaAprobadaId?: string) => {
    const solicitudIdAprobada =
      typeof solicitudRebajaAprobadaId === "string" &&
      solicitudRebajaAprobadaId.trim().length > 0
        ? solicitudRebajaAprobadaId.trim()
        : undefined;

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

      const rebajaListaParaCobro =
        !!solicitudIdAprobada || (rebajaAutorizada && !!solicitudRebajaId);

      if (requiereAutorizacionRemota) {
        if (esperandoAutorizacionRebaja && !rebajaListaParaCobro) {
          toast.warn(
            "Sigue en espera de confirmación administrativa. Un admin debe autorizar la rebaja.",
          );
          setShowModalAutorizacionRebaja(true);
          return;
        }

        if (!rebajaListaParaCobro) {
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
          await refrescarQueriesRebajaVentas(queryClient, res.solicitud_id);
          cobroPendienteTrasRebajaRef.current = true;
          carritoSnapshotRef.current = JSON.stringify(
            carrito.map((i) => ({
              id: i.comercial.producto_id,
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

      const incluyeReceta = carritoRequiereReceta(carrito);
      setUltimaVentaIncluyeReceta(incluyeReceta);

      if (tipoVenta === "Crédito" && creditoVencido?.vencido) {
        if (!esAdminSesion || !autorizarCreditoMoroso) {
          toast.warn(
            mensajeCreditoVencidoCliente(
              creditoVencido.total,
              creditoVencido.desde ?? "",
            ),
          );
          return;
        }
      }

      if (incluyeReceta) {
        if (!recetaMedicoNombre.trim() || !recetaColegiado.trim()) {
          toast.warn(
            "Registra el nombre del médico y el número de colegiado antes de cobrar.",
          );
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
        const freshDetails = mapCarritoToReciboItems(carrito);
        const clientSave = clienteSeleccionado;
        setCarrito([]);
        setClienteSeleccionado(null);
        setClienteBusqueda("Consumidor Final");
        setObservaciones("");
        setReciboModalData({
          venta: ventaObj,
          detalles: [],
          reciboItems: freshDetails,
          clienteCompleto: clientSave,
        });
        toast.info("Venta simulada — no se guardó en la base de datos.");
        return;
      }

      const itemsFormatted: ItemVentaInput[] = carrito.map((i) => ({
        producto_id: i.comercial.producto_id,
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
        solicitud_rebaja_id: rebajaListaParaCobro
          ? solicitudIdAprobada ?? solicitudRebajaId ?? undefined
          : undefined,
        credito_autorizado_por:
          tipoVenta === "Crédito" &&
          creditoVencido?.vencido &&
          autorizarCreditoMoroso &&
          esAdminSesion &&
          user?.id
            ? user.id
            : undefined,
        receta: incluyeReceta
          ? {
              medico_nombre: recetaMedicoNombre.trim(),
              colegiado: recetaColegiado.trim(),
              numero_receta: recetaNumero.trim() || null,
            }
          : undefined,
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

      const reciboItems = mapCarritoToReciboItems(carrito);

      refetchDatos();
      const clientSave = clienteSeleccionado;

      setCarrito([]);
      setClienteSeleccionado(null);
      setClienteBusqueda("Consumidor Final");
      setObservaciones("");
      setRecetaMedicoNombre("");
      setRecetaColegiado("");
      setRecetaNumero("");
      setAutorizarCreditoMoroso(false);

      setReciboModalData({
        venta: ventaObj,
        detalles: [],
        reciboItems,
        clienteCompleto: clientSave,
        incluyeReceta,
      });
      limpiarFlujoRebaja();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo completar el cobro.";
      toast.error(message);
    } finally {
      setIsProcesandoVenta(false);
    }
  };

  ejecutarCobroRef.current = ejecutarCobro;

  useEffect(() => {
    if (
      !rebajaAutorizada ||
      !cobroPendienteTrasRebajaRef.current ||
      !solicitudRebajaId
    ) {
      return;
    }
    cobroPendienteTrasRebajaRef.current = false;
    toast.success("Rebaja autorizada. Registrando la venta…");
    void ejecutarCobroRef.current?.(solicitudRebajaId);
  }, [rebajaAutorizada, solicitudRebajaId]);

  return (
    <VentasContext.Provider value={{
      activeTab, setActiveTab,
      carrito, setCarrito,
      genericoBusqueda, setGenericoBusqueda,
      genericoSeleccionado, setGenericoSeleccionado,
      comercialSeleccionado, setComercialSeleccionado,
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
      advertenciaVencimientoPos,
      setAdvertenciaVencimientoPos,
      ticketParaImprimir, setTicketParaImprimir,
      reciboCaptura, setReciboCaptura,
      reciboModalData, setReciboModalData,
      handleAgregarAlCarrito,
      handleAjustarCantidad,
      handleAjustarCantidadGrupo,
      handleEliminarDelCarrito,
      handleEliminarGrupoCarrito,
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
      creditoVencido,
      autorizarCreditoMoroso,
      setAutorizarCreditoMoroso,
      recetaMedicoNombre,
      setRecetaMedicoNombre,
      recetaColegiado,
      setRecetaColegiado,
      recetaNumero,
      setRecetaNumero,
      reciboFarmacia,
      ultimaVentaIncluyeReceta,
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
