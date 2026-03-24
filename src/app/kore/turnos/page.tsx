"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Swal from 'sweetalert2';
import { createClient } from "@/utils/supabase/client";
import { crearTurnoAction, cambiarEstadoTurnoAction } from "@/lib/actions";
import { 
  Users, Home, ChevronRight, Clock, 
  PlayCircle, CheckCircle2, Plus, Search, Stethoscope, UserPlus
} from "lucide-react";

export default function TurnosPage() {
  const [turnos, setTurnos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Estados para nuevo turno
  const [clienteId, setClienteId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const cargarDatos = async () => {
    setCargando(true);
    const supabase = createClient();
    
    // Solo cargamos los turnos de HOY que no estén finalizados
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    const { data: turnosData } = await supabase
      .from("turnos")
      .select("*, clientes(nombre, dpi)")
      .gte('created_at', hoy.toISOString())
      .neq('estado', 'Finalizado')
      .order('created_at', { ascending: true });

    const { data: clientesData } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });

    if (turnosData) setTurnos(turnosData);
    if (clientesData) setClientes(clientesData);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
    // Opcional: Podrías poner un setInterval aquí para que la pantalla del doctor 
    // se actualice sola cada 10 segundos buscando nuevos pacientes.
  }, []);

  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await crearTurnoAction({ cliente_id: clienteId, motivo_visita: motivo });
    if (res.success) {
      setMostrarModal(false);
      setClienteId(""); setMotivo(""); setBusquedaCliente("");
      cargarDatos();
      const isDark = document.documentElement.classList.contains('dark');
      Swal.fire({ toast: true, position: 'top-end', title: 'Paciente en sala de espera', icon: 'success', showConfirmButton: false, timer: 2000, background: isDark ? '#1E1E1E' : '#ffffff', color: isDark ? '#ffffff' : '#000000' });
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    await cambiarEstadoTurnoAction(id, nuevoEstado);
    cargarDatos();
  };

  const formatearHora = (fecha: string) => new Date(fecha).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  const clientesFiltrados = clientes.filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) || (c.dpi && c.dpi.includes(busquedaCliente)));
  const enEspera = turnos.filter(t => t.estado === 'En Espera');
  const enConsulta = turnos.filter(t => t.estado === 'En Consulta');

  return (
    <main className="p-8 w-full max-w-7xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200 min-h-screen relative">
      
      <div className="mb-6 w-full">
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-[#1E1E1E]/50 w-fit px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm backdrop-blur-sm">
          <Link href="/kore" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"><Home size={16} /> Panel</Link>
          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
          <span className="text-gray-900 dark:text-gray-100 font-bold flex items-center gap-1.5"><Users size={16} className="text-blue-500" /> Sala de Espera</span>
        </nav>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">Control de Turnos <Clock className="text-blue-500 animate-pulse" /></h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de Triage y flujo de pacientes en clínica.</p>
        </div>
        <button onClick={() => setMostrarModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
          <UserPlus size={20} /> Ingresar Paciente
        </button>
      </div>

      {cargando ? (
         <p className="text-gray-500 font-bold animate-pulse">Cargando sala de espera...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* COLUMNA 1: EN ESPERA */}
          <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-3xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
              <h2 className="text-xl font-black text-orange-600 dark:text-orange-500 flex items-center gap-2">
                <Users /> En Espera
              </h2>
              <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1 rounded-full font-bold text-sm">
                {enEspera.length} Pacientes
              </span>
            </div>

            <div className="space-y-4">
              {enEspera.length === 0 ? (
                <p className="text-center text-gray-500 py-8 font-medium">No hay pacientes esperando.</p>
              ) : (
                enEspera.map((turno, index) => (
                  <div key={turno.id} className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border border-orange-100 dark:border-orange-900/30 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-orange-300 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-black text-xl w-12 h-12 rounded-xl flex items-center justify-center border border-orange-100 dark:border-orange-900/50 shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{turno.clientes?.nombre}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={12}/> Llegada: {formatearHora(turno.created_at)}</p>
                        {turno.motivo_visita && <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 font-medium bg-orange-50 dark:bg-orange-900/10 px-2 py-1 rounded w-fit">"{turno.motivo_visita}"</p>}
                      </div>
                    </div>
                    <button onClick={() => handleCambiarEstado(turno.id, 'En Consulta')} className="w-full md:w-auto bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      <PlayCircle size={18} /> Llamar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMNA 2: EN CONSULTA */}
          <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-3xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
              <h2 className="text-xl font-black text-blue-600 dark:text-blue-500 flex items-center gap-2">
                <Stethoscope /> En Consultorio
              </h2>
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full font-bold text-sm">
                {enConsulta.length} Atendiendo
              </span>
            </div>

            <div className="space-y-4">
              {enConsulta.length === 0 ? (
                <p className="text-center text-gray-500 py-8 font-medium">El consultorio está libre.</p>
              ) : (
                enConsulta.map(turno => (
                  <div key={turno.id} className="bg-white dark:bg-[#1E1E1E] p-5 rounded-2xl border-2 border-blue-400 dark:border-blue-600 shadow-md shadow-blue-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                    <div>
                      <span className="text-xs font-black tracking-widest text-blue-500 uppercase flex items-center gap-1 mb-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Atendiendo Ahora</span>
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white leading-tight">{turno.clientes?.nombre}</h3>
                      <Link href="/kore/clientes" className="text-sm text-blue-600 hover:underline mt-2 inline-block font-medium">Ir a su Expediente Clínico &rarr;</Link>
                    </div>
                    <button onClick={() => handleCambiarEstado(turno.id, 'Finalizado')} className="w-full md:w-auto bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      <CheckCircle2 size={18} /> Finalizar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODAL PARA INGRESAR PACIENTE A LA COLA */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-extrabold flex items-center gap-2"><UserPlus /> Ingreso a Recepción</h2>
            </div>
            
            <form onSubmit={handleCrearTurno} className="p-6 space-y-5">
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Buscar Paciente Registrado</label>
                <div className="relative mb-3">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                  <input type="text" placeholder="Buscar por nombre o DPI..." value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white" />
                </div>
                
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none dark:text-white" required size={4}>
                  <option value="" disabled className="text-gray-400">Selecciona el paciente de la lista...</option>
                  {clientesFiltrados.map(c => (
                    <option key={c.id} value={c.id} className="p-2 border-b border-gray-100 dark:border-gray-800">{c.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2 text-right">¿No está? <Link href="/kore/clientes" className="text-blue-500 hover:underline">Regístralo primero</Link></p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Motivo de Visita (Opcional)</label>
                <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Chequeo de presión, dolor de cabeza..." className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all">Cancelar</button>
                <button type="submit" disabled={!clienteId} className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">Añadir a Cola</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}