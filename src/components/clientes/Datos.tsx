"use client";

import { useState, useEffect } from "react";
import Swal from 'sweetalert2';
import { 
  crearClienteAction, editarClienteAction, eliminarClienteAction, 
  crearConsultaAction, eliminarConsultaAction, crearRecetaAction 
} from "@/lib/actions";
import { createClient } from "@/utils/supabase/client";
import { 
  User, CreditCard, Phone, MapPin, Save, Sparkles, 
  Trash2, X, Activity, Stethoscope, HeartPulse, 
  Clock, Plus, FileText, ChevronLeft, Pill, Send, Printer, UserCircle2
} from "lucide-react";
// IMPORTAMOS jsPDF para las recetas médicas
import jsPDF from "jspdf";

interface DatosProps {
  clienteActual?: any;
  onCompletado?: () => void;
  onCancelar?: () => void;
}

export default function Datos({ clienteActual, onCompletado, onCancelar }: DatosProps) {
  // === ESTADOS DE NAVEGACIÓN ===
  const [tabActiva, setTabActiva] = useState<'datos' | 'consultas'>('datos');
  const [modoNuevaConsulta, setModoNuevaConsulta] = useState(false);
  const [loading, setLoading] = useState(false);

  // === ESTADOS DEL PACIENTE ===
  const [nombre, setNombre] = useState("");
  const [dpi, setDpi] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [condicionesCronicas, setCondicionesCronicas] = useState("");

  // === ESTADOS DEL HISTORIAL Y FARMACIA ===
  const [historial, setHistorial] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  // === ESTADOS DE LA NUEVA CONSULTA ===
  const [motivo, setMotivo] = useState("");
  const [presion, setPresion] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [peso, setPeso] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [notasPlan, setNotasPlan] = useState("");

  // === ESTADOS DEL CONSTRUCTOR DE RECETA ELECTRÓNICA ===
  const [medicamentosReceta, setMedicamentosReceta] = useState<any[]>([]);
  const [medSeleccionado, setMedSeleccionado] = useState("");
  const [medCantidad, setMedCantidad] = useState(1);
  const [medDosis, setMedDosis] = useState("");

  useEffect(() => {
    if (clienteActual) {
      setNombre(clienteActual.nombre || "");
      setDpi(clienteActual.dpi || "");
      setTelefono(clienteActual.telefono || "");
      setDireccion(clienteActual.direccion || "");
      setCondicionesCronicas(clienteActual.condiciones_cronicas || "");
    } else {
      setNombre(""); setDpi(""); setTelefono(""); setDireccion(""); setCondicionesCronicas("");
      setTabActiva('datos');
    }
  }, [clienteActual]);

  // Cargar historial e inventario al abrir la pestaña de consultas
  useEffect(() => {
    if (clienteActual?.id && tabActiva === 'consultas') {
      cargarDatosClinicos();
    }
  }, [clienteActual, tabActiva]);

  const cargarDatosClinicos = async () => {
    setCargandoDatos(true);
    const supabase = createClient();
    
    // 1. Cargamos el historial de consultas del paciente
    const { data: consultasData } = await supabase
      .from('consultas')
      .select('*')
      .eq('cliente_id', clienteActual.id)
      .order('created_at', { ascending: false });
    if (consultasData) setHistorial(consultasData);

    // 2. Cargamos el inventario de farmacia para el selector (solo medicinas con stock)
    const { data: invData } = await supabase
      .from('productos')
      .select('id, nombre, stock')
      .gt('stock', 0)
      .order('nombre', { ascending: true });
    if (invData) setInventario(invData);

    setCargandoDatos(false);
  };

  // === AGREGAR MEDICINA A LA RECETA VIRTUAL ===
  const agregarMedicamento = () => {
    if (!medSeleccionado || medCantidad < 1) return;
    
    const producto = inventario.find(p => p.id === medSeleccionado);
    if (!producto) return;

    if (medCantidad > producto.stock) {
      Swal.fire('Stock Insuficiente', `Solo hay ${producto.stock} unidades de ${producto.nombre} en farmacia.`, 'warning');
      return;
    }

    const nuevoMed = {
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: medCantidad,
      dosis: medDosis || "Según indicaciones médicas"
    };

    setMedicamentosReceta([...medicamentosReceta, nuevoMed]);
    setMedSeleccionado(""); setMedCantidad(1); setMedDosis("");
  };

  const quitarMedicamento = (index: number) => {
    const nuevaReceta = [...medicamentosReceta];
    nuevaReceta.splice(index, 1);
    setMedicamentosReceta(nuevaReceta);
  };

  // === GUARDAR PACIENTE ===
  const handleGuardarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dpi && !/^\d{13}$/.test(dpi)) {
      Swal.fire('DPI Inválido', 'El CUI/DPI debe tener exactamente 13 números, sin espacios ni guiones.', 'warning');
      return;
    }
    setLoading(true);
    const datosPaciente = { 
      nombre, dpi: dpi || null, telefono: telefono || null, 
      direccion: direccion || null, condiciones_cronicas: condicionesCronicas || null
    };
    
    let result;
    if (clienteActual?.id) {
      result = await editarClienteAction(clienteActual.id, datosPaciente);
    } else {
      result = await crearClienteAction(datosPaciente);
    }

    if (result.success) {
      const isDark = document.documentElement.classList.contains('dark');
      Swal.fire({ toast: true, position: 'top-end', title: 'Expediente actualizado', icon: 'success', showConfirmButton: false, timer: 2000, background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
      if (onCompletado) onCompletado();
    } else {
      Swal.fire('Error', result.error || 'No se pudo guardar.', 'error');
    }
    setLoading(false);
  };

  // === GUARDAR CONSULTA Y ENVIAR RECETA ===
  const handleGuardarConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteActual?.id) return;
    setLoading(true);

    // Construimos un resumen en texto de la receta para que quede guardado en el historial de la consulta
    let textoReceta = notasPlan;
    if (medicamentosReceta.length > 0) {
      textoReceta += "\n\n-- RECETA ENVIADA A FARMACIA --\n";
      medicamentosReceta.forEach(m => {
        textoReceta += `• ${m.nombre} (Cant: ${m.cantidad}). Dosis: ${m.dosis}\n`;
      });
    }

    const datosConsulta = {
      cliente_id: clienteActual.id,
      motivo,
      presion_arterial: presion || null,
      temperatura: temperatura || null,
      peso: peso || null,
      sintomas: sintomas || null,
      diagnostico: diagnostico || null,
      receta_sugerida: textoReceta || null
    };

    // 1. Guardamos la consulta clínica
    const resConsulta = await crearConsultaAction(datosConsulta);

    if (resConsulta.success) {
      // 2. Si hay medicinas, enviamos la Receta Electrónica a Farmacia
      if (medicamentosReceta.length > 0) {
        await crearRecetaAction({
          cliente_id: clienteActual.id,
          medicamentos: medicamentosReceta
        });
      }

      const isDark = document.documentElement.classList.contains('dark');
      Swal.fire({ toast: true, position: 'top-end', title: 'Consulta Registrada', icon: 'success', showConfirmButton: false, timer: 2000, background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
      
      // Limpiar formulario
      setMotivo(""); setPresion(""); setTemperatura(""); setPeso(""); setSintomas(""); 
      setDiagnostico(""); setNotasPlan(""); setMedicamentosReceta([]);
      setModoNuevaConsulta(false);
      cargarDatosClinicos();
    } else {
      Swal.fire('Error', resConsulta.error || 'No se pudo guardar.', 'error');
    }
    setLoading(false);
  };

  const handleEliminarConsulta = async (id: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    const confirmacion = await Swal.fire({
      title: '¿Eliminar consulta?', text: "Se borrará del historial clínico.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonText: 'Cancelar',
      background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000',
    });

    if (confirmacion.isConfirmed) {
      const res = await eliminarConsultaAction(id);
      if (res.success) {
        Swal.fire({ toast: true, position: 'top-end', title: 'Eliminada', icon: 'success', showConfirmButton: false, timer: 2000, background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
        cargarDatosClinicos();
      }
    }
  };

  const handleEliminarPaciente = async () => {
    if (!clienteActual?.id) return;
    const isDark = document.documentElement.classList.contains('dark');
    const confirmacion = await Swal.fire({
      title: '¿Eliminar expediente?', text: "Se borrará al paciente y todo su historial.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonText: 'Cancelar',
      background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000',
    });

    if (confirmacion.isConfirmed) {
      setLoading(true);
      const res = await eliminarClienteAction(clienteActual.id);
      if (res.success) {
        Swal.fire({ toast: true, position: 'top-end', title: 'Eliminado', icon: 'success', showConfirmButton: false, timer: 2000, background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
        if (onCompletado) onCompletado();
      }
      setLoading(false);
    }
  };

  // ==========================================
  //  NUEVO: GENERADOR DE RECETA PDF (A5)
  // ==========================================
  const imprimirRecetaPDF = (consulta: any) => {
    // Definimos el tamaño A5
    const doc = new jsPDF({ format: 'a5' }); 
    const fechaImpresion = new Date(consulta.created_at).toLocaleDateString('es-GT');
    const margin = 12; // Márgenes consistentes

    // === ENCABEZADO INSTITUCIONAL ===
    // 1. Logo Real Municipal
    // Asegúrate de tener logo.png en /public. Lo cargamos como imagen base64
    // Para simplificar aquí, usaremos un placeholder de círculo, pero cámbialo por doc.addImage
   const imgWidth = 18;
    const imgHeight = 18;
    doc.addImage('/logo.png', 'PNG', margin, margin, imgWidth, imgHeight);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MUNI", margin + 6, margin + 10);

    // 2. Texto Institucional
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30); // Gris muy oscuro
    doc.text("CLÍNICA MUNICIPAL", margin + 28, margin + 6);
    
    doc.setFontSize(10);
    doc.setTextColor(60); // Gris medio
    doc.text("Municipalidad de Concepción Las Minas", margin + 28, margin + 11);
    doc.text("Chiquimula, Guatemala", margin + 28, margin + 16);

    // Línea divisoria decorativa
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 24, 148 - margin, margin + 24);

    // === DATOS DEL PACIENTE ===
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100); // Gris claro
    doc.text("PACIENTE:", margin, margin + 32);
    
    doc.setTextColor(0); // Negro
    doc.setFontSize(11);
    doc.text(clienteActual?.nombre || 'General', margin, margin + 37);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("DPI/CUI:", margin + 80, margin + 32);
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(clienteActual?.dpi || "N/A", margin + 80, margin + 37);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("FECHA CONSULTA:", margin, margin + 44);
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(fechaImpresion, margin, margin + 49);

    // === SIGNOS VITALES ===
    doc.setFillColor(245, 248, 255); // Fondo azul muy pálido
    doc.roundedRect(margin, margin + 55, 148 - (margin * 2), 15, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235); // Azul Médico
    doc.setFont("helvetica", "bold");
    doc.text("P. ARTERIAL:", margin + 5, margin + 64);
    doc.setTextColor(0);
    doc.text(consulta.presion_arterial || "--", margin + 28, margin + 64);

    doc.setTextColor(37, 99, 235);
    doc.text("TEMP (°C):", margin + 48, margin + 64);
    doc.setTextColor(0);
    doc.text(consulta.temperatura || "--", margin + 67, margin + 64);

    doc.setTextColor(37, 99, 235);
    doc.text("PESO (LBS):", margin + 85, margin + 64);
    doc.setTextColor(0);
    doc.text(consulta.peso || "--", margin + 107, margin + 64);

    // === DIAGNÓSTICO Y PLAN ===
    let currentY = margin + 80;

    if (consulta.diagnostico) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      doc.text("DIAGNÓSTICO:", margin, currentY);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const diagLines = doc.splitTextToSize(consulta.diagnostico, 148 - (margin * 2));
      doc.text(diagLines, margin, currentY + 6);
      currentY += 6 + (diagLines.length * 6) + 10;
    }

    // === Rx (RECETA MÉDICA) ===
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); // Azul Médico
    doc.text("Rx (Receta):", margin, currentY);
    
    // Icono Rx decorativo
    doc.setFontSize(28);
    doc.setTextColor(230); // Gris muy claro
    doc.text("Rx", 148 - margin - 15, currentY + 2);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    const recetaTexto = consulta.receta_sugerida || "Sin indicaciones registradas.";
    const recetaLines = doc.splitTextToSize(recetaTexto, 148 - (margin * 2));
    doc.text(recetaLines, margin, currentY + 8);

    // === PIE DE PÁGINA: FIRMA Y SELLO ===
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    const footerY = 210 - margin - 30; // Posicionamiento al fondo
    doc.line(40, footerY, 108, footerY); // Línea central
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Firma y Sello del Médico", 55, footerY + 5);
    doc.text("Colegiado: __________", 58, footerY + 10);

    // === DESCARGAR ===
    const nombreLimpio = clienteActual?.nombre?.replace(/\s/g, '_') || 'Paciente';
    doc.save(`Receta_Medica_${nombreLimpio}_${fechaImpresion.replace(/\//g, '-')}.pdf`);
  };

  const formatearFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });

  const inputBaseClasses = "w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl transition-all outline-none hover:bg-white dark:hover:bg-black/40 hover:border-emerald-300 dark:hover:border-emerald-500/50 focus:border-emerald-500 focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-emerald-100/50 appearance-none";
  const labelClasses = "block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300";

  return (
    <div className="w-full bg-white dark:bg-[#1E1E1E] shadow-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors duration-200">
      
      {/* HEADER INSTITUCIONAL */}
      <div className={`p-6 text-white flex items-center justify-between relative overflow-hidden transition-colors duration-500 ${tabActiva === 'consultas' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
        <Sparkles className="absolute top-4 right-4 text-white/20 h-24 w-24 -rotate-12 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 shadow-inner">
            {tabActiva === 'consultas' ? <Stethoscope size={28} className="text-white drop-shadow-sm" /> : <UserCircle2 size={28} className="text-white drop-shadow-sm" />}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              {clienteActual ? (tabActiva === 'consultas' ? "Módulo Clínico" : "Expediente del Paciente") : "Nuevo Paciente"}
            </h2>
            <p className="text-white/80 text-sm mt-0.5 font-medium">{clienteActual ? clienteActual.nombre : "Registro comunitario."}</p>
          </div>
        </div>
        <button type="button" onClick={onCancelar} className="relative z-10 bg-black/10 hover:bg-black/20 p-2 rounded-full transition-colors backdrop-blur-sm" title="Cerrar"><X size={24} /></button>
      </div>

      {/* PESTAÑAS (TABS) */}
      {clienteActual && (
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#151515]">
          <button onClick={() => { setTabActiva('datos'); setModoNuevaConsulta(false); }} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${tabActiva === 'datos' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1E1E1E]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <User size={18} /> Datos Personales
          </button>
          <button onClick={() => setTabActiva('consultas')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${tabActiva === 'consultas' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1E1E1E]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Stethoscope size={18} /> Historial y Recetas
          </button>
        </div>
      )}

      {/* PESTAÑA 1: DATOS PERSONALES */}
      {tabActiva === 'datos' && (
        <form onSubmit={handleGuardarPaciente} className="p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <div>
            <label className={labelClasses}>Nombre Completo <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-emerald-500" /></div>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputBaseClasses} placeholder="Nombre del paciente" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>DPI (CUI)</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><CreditCard className="h-5 w-5 text-emerald-500" /></div>
                <input type="text" value={dpi} onChange={(e) => setDpi(e.target.value.replace(/\D/g, ''))} maxLength={13} className={inputBaseClasses} placeholder="13 dígitos sin espacios" />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Teléfono de Contacto</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-emerald-500" /></div>
                <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputBaseClasses} placeholder="Ej. 5555-5555" />
              </div>
            </div>
          </div>
          <div>
            <label className={labelClasses}>Comunidad / Residencia</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-emerald-500" /></div>
              <select value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputBaseClasses}>
                <option value="">Seleccione una comunidad...</option>
                <optgroup label="Casco Urbano">
                  <option value="Cabecera Municipal">Cabecera Municipal</option>
                  <option value="Barrio El Espino">Barrio El Espino</option>
                  <option value="Barrio El Socorro">Barrio El Socorro</option>
                </optgroup>
                <optgroup label="Aldeas">
                  <option value="Aldea Anguiatú">Aldea Anguiatú</option>
                  <option value="Aldea Apantes">Aldea Apantes</option>
                  <option value="Aldea Cruz Calle">Aldea Cruz Calle</option>
                  <option value="Aldea El Jícaro">Aldea El Jícaro</option>
                  <option value="Aldea Guacamayas">Aldea Guacamayas</option>
                  <option value="Aldea La Cañada">Aldea La Cañada</option>
                  <option value="Aldea La Ermita">Aldea La Ermita</option>
                  <option value="Aldea Liquidámbar">Aldea Liquidámbar</option>
                  <option value="Aldea Monte Barroso">Aldea Monte Barroso</option>
                  <option value="Aldea Rodeo El Espino">Aldea Rodeo El Espino</option>
                  <option value="Aldea San Antonio">Aldea San Antonio</option>
                  <option value="Aldea San José">Aldea San José</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <label className={labelClasses}>Antecedentes y Alergias</label>
            <div className="relative mt-1">
              <div className="absolute top-4 left-0 pl-4 pointer-events-none"><HeartPulse className="h-5 w-5 text-emerald-600" /></div>
              <textarea value={condicionesCronicas} onChange={(e) => setCondicionesCronicas(e.target.value)} className={`${inputBaseClasses} border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 py-3 min-h-[80px] resize-none`} rows={2} placeholder="Describa si padece alguna enfermedad crónica..." />
            </div>
          </div>
          <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
            <button type="button" onClick={onCancelar} className="px-6 py-4 rounded-xl text-lg font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 transition-all active:scale-95">Cancelar</button>
            <button type="submit" disabled={loading} className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 ${loading ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"}`}>
              <Save size={22} /> Guardar Expediente
            </button>
            {clienteActual && <button type="button" onClick={handleEliminarPaciente} className="flex items-center justify-center p-4 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 bg-red-500 hover:bg-red-600 px-6"><Trash2 size={22} /></button>}
          </div>
        </form>
      )}

      {/* PESTAÑA 2: HISTORIAL Y RECETA ELECTRÓNICA */}
      {tabActiva === 'consultas' && (
        <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
          
          {!modoNuevaConsulta ? (
            // VISTA 1: LISTA DE HISTORIAL
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={24} className="text-blue-500" /> Consultas Previas
                </h3>
                <button onClick={() => setModoNuevaConsulta(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-transform active:scale-95 text-sm">
                  <Plus size={18} /> Iniciar Consulta
                </button>
              </div>

              {cargandoDatos ? (
                <p className="text-gray-500 font-bold animate-pulse text-center py-8">Cargando historial médico...</p>
              ) : historial.length === 0 ? (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-10 text-center rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <Stethoscope className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                  <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">Sin historial previo</p>
                  <p className="text-sm text-gray-500 mt-1">Este paciente no ha recibido atención médica en la clínica aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historial.map((consulta) => (
                    <div key={consulta.id} className="bg-gray-50 dark:bg-[#151515] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 relative group">
                      
                      {/* BOTONES DE ACCIÓN ABSOLUTOS (IMPRIMIR Y ELIMINAR) */}
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        {consulta.receta_sugerida && (
                          <button onClick={() => imprimirRecetaPDF(consulta)} className="text-blue-500 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Imprimir Receta Médica">
                            <Printer size={18} />
                          </button>
                        )}
                        <button onClick={() => handleEliminarConsulta(consulta.id)} className="text-gray-400 hover:text-red-500 bg-white dark:bg-[#1E1E1E] p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar registro">
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 font-semibold">
                        <Clock size={14} className="text-blue-500" /> {formatearFecha(consulta.created_at)}
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 pr-20">{consulta.motivo}</h4>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {consulta.presion_arterial && <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-bold border border-red-100">PA: {consulta.presion_arterial}</span>}
                        {consulta.temperatura && <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-md text-xs font-bold border border-orange-100">Temp: {consulta.temperatura}</span>}
                        {consulta.peso && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-xs font-bold border border-blue-100">Peso: {consulta.peso}</span>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                        {consulta.sintomas && (<div><p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Síntomas:</p><p className="text-gray-600 dark:text-gray-400">{consulta.sintomas}</p></div>)}
                        {consulta.diagnostico && (<div><p className="font-bold text-blue-600 dark:text-blue-400 mb-1">Diagnóstico:</p><p className="text-gray-600 dark:text-gray-400">{consulta.diagnostico}</p></div>)}
                        {consulta.receta_sugerida && (
                          <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 mt-2 relative">
                            <p className="font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1.5"><Pill size={14}/> Receta Médica Emitida:</p>
                            <p className="text-blue-600 dark:text-blue-400 font-mono text-xs whitespace-pre-wrap">{consulta.receta_sugerida}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // VISTA 2: FORMULARIO DE NUEVA CONSULTA + RECETA ELECTRÓNICA
            <form onSubmit={handleGuardarConsulta} className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 mb-2 pb-4 border-b border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setModoNuevaConsulta(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Evaluación y Emisión de Receta</h3>
                  <p className="text-sm text-gray-500">Registre el diagnóstico y envíe los medicamentos a farmacia.</p>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Motivo de la Consulta <span className="text-red-500">*</span></label>
                <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl focus:border-blue-500 outline-none dark:text-white" required />
              </div>

              {/* SIGNOS VITALES */}
              <div className="bg-gray-50 dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Activity size={16}/> Signos Vitales</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Presión (Ej. 120/80)</label><input type="text" value={presion} onChange={(e) => setPresion(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-black/40 border border-gray-200 rounded-lg text-sm outline-none dark:text-white" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Temp (°C)</label><input type="text" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-black/40 border border-gray-200 rounded-lg text-sm outline-none dark:text-white" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Peso (Lbs)</label><input type="text" value={peso} onChange={(e) => setPeso(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-black/40 border border-gray-200 rounded-lg text-sm outline-none dark:text-white" /></div>
                </div>
              </div>

              {/* SÍNTOMAS Y DIAGNÓSTICO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className={labelClasses}>Síntomas Presentados</label><textarea value={sintomas} onChange={(e) => setSintomas(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 rounded-xl min-h-[80px] resize-none outline-none dark:text-white" /></div>
                <div><label className={labelClasses}>Diagnóstico Médico</label><textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 rounded-xl min-h-[80px] resize-none outline-none dark:text-white" /></div>
              </div>

              {/* CONSTRUCTOR DE RECETA ELECTRÓNICA */}
              <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Send size={16}/> Enviar Receta a Farmacia</h4>
                
                {/* Buscador y Añadir */}
                <div className="flex flex-col md:flex-row gap-3 mb-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Medicina (En inventario)</label>
                    <select value={medSeleccionado} onChange={(e) => setMedSeleccionado(e.target.value)} className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none dark:bg-[#1E1E1E] dark:text-white">
                      <option value="">Seleccione una medicina...</option>
                      {inventario.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.nombre} - (Stock: {inv.stock})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full md:w-24">
                    <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Cant.</label>
                    <input type="number" min="1" value={medCantidad} onChange={(e) => setMedCantidad(Number(e.target.value))} className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm text-center outline-none dark:bg-[#1E1E1E] dark:text-white" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Dosis (Ej. 1 cada 8 hrs)</label>
                    <input type="text" value={medDosis} onChange={(e) => setMedDosis(e.target.value)} className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none dark:bg-[#1E1E1E] dark:text-white" />
                  </div>
                  <button type="button" onClick={agregarMedicamento} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm w-full md:w-auto h-[42px]">
                    Añadir
                  </button>
                </div>

                {/* Lista de Medicinas Añadidas */}
                {medicamentosReceta.length > 0 && (
                  <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-blue-100 overflow-hidden mb-4">
                    {medicamentosReceta.map((med, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-100 text-sm">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1"><Pill size={14} className="text-blue-500"/> {med.nombre}</p>
                          <p className="text-xs text-gray-500">Tomar: {med.dosis} | Se enviarán: <span className="font-bold">{med.cantidad} und.</span></p>
                        </div>
                        <button type="button" onClick={() => quitarMedicamento(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">Notas adicionales para el paciente (Opcional)</label>
                  <textarea value={notasPlan} onChange={(e) => setNotasPlan(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-black/40 border border-blue-200 rounded-lg text-sm min-h-[60px] resize-none outline-none dark:text-white" placeholder="Ej. Tomar con las comidas, reposo absoluto..." />
                </div>
              </div>

              {/* BOTONES FINALES */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setModoNuevaConsulta(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">Cancelar</button>
                <button type="submit" disabled={loading} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"}`}>
                  {loading ? "Procesando..." : <><Save size={20}/> {medicamentosReceta.length > 0 ? "Guardar y Enviar Receta" : "Guardar Consulta"}</>}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}