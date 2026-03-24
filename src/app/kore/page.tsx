"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { 
  Package, Users, ShoppingCart, Wallet, AlertTriangle, 
  TrendingUp, ArrowRight, X, BarChart3, TrendingDown, Activity,
  CalendarDays, Clock, MapPin, Receipt, AlertOctagon, Stethoscope
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

export default function PanelDeControl() {
  const [metricas, setMetricas] = useState({ totalClientes: 0, ingresos: 0, alertasStock: 0, totalVentas: 0, alertasCaducidad: 0, agotados: 0 });
  const [detalles, setDetalles] = useState({ ventas: [] as any[], productosAlerta: [] as any[], productosAgotados: [] as any[], clientes: [] as any[], productosCaducidad: [] as any[] });
  
  const [cargando, setCargando] = useState(true);
  const [modalActivo, setModalActivo] = useState<string | null>(null);
  const [filtroTiempo, setFiltroTiempo] = useState<'7d' | '30d' | '12m'>('7d');

  useEffect(() => {
    const cargarMetricas = async () => {
      setCargando(true);
      const supabase = createClient();

      const { data: clientesData } = await supabase.from("clientes").select("*").order("created_at", { ascending: false });
      const { data: productosData } = await supabase.from("productos").select("*").order("stock", { ascending: true });
      const { data: ventasData } = await supabase.from("ventas").select("*, clientes(nombre), productos(nombre)").order("created_at", { ascending: false });
      
      const alertas = productosData?.filter(p => p.stock > 0 && p.stock <= (p.stock_minimo || 5)) || [];
      const agotados = productosData?.filter(p => p.stock === 0) || [];
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const limiteCaducidad = new Date(hoy);
      limiteCaducidad.setDate(limiteCaducidad.getDate() + 90);

      const caducidades = productosData?.filter(p => {
        if (!p.fecha_caducidad) return false;
        const fechaCad = new Date(p.fecha_caducidad);
        fechaCad.setDate(fechaCad.getDate() + 1); 
        return fechaCad <= limiteCaducidad;
      }) || [];

      const ingresosTotales = ventasData?.reduce((sum, venta) => sum + (Number(venta.total) || 0), 0) || 0;

      setMetricas({ 
        totalClientes: clientesData?.length || 0, 
        ingresos: ingresosTotales, 
        alertasStock: alertas.length, 
        totalVentas: ventasData?.length || 0,
        alertasCaducidad: caducidades.length,
        agotados: agotados.length
      });
      
      setDetalles({ 
        ventas: ventasData || [], 
        productosAlerta: alertas, 
        productosAgotados: agotados, 
        clientes: clientesData || [],
        productosCaducidad: caducidades 
      });
      
      setCargando(false);
    };

    cargarMetricas();
  }, []);

  const formatearFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });

  const calcularDiasFaltantes = (fechaStr: string) => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const fechaCad = new Date(fechaStr);
    fechaCad.setDate(fechaCad.getDate() + 1);
    const dif = fechaCad.getTime() - hoy.getTime();
    return Math.ceil(dif / (1000 * 3600 * 24));
  };

  const datosGrafica = useMemo(() => {
    const hoy = new Date();
    const baseData: any[] = [];

    if (filtroTiempo === '12m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const mesStr = d.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' }).toUpperCase();
        baseData.push({ fechaVisual: mesStr, ingresos: 0, cantidadVentas: 0, mes: d.getMonth(), año: d.getFullYear() });
      }
    } else {
      const dias = filtroTiempo === '7d' ? 6 : 29; 
      for (let i = dias; i >= 0; i--) {
        const d = new Date(hoy);
        d.setDate(d.getDate() - i);
        const diaStr = d.toLocaleDateString('es-GT', { month: 'short', day: '2-digit' });
        baseData.push({ fechaVisual: diaStr, ingresos: 0, cantidadVentas: 0, dateStr: d.toDateString() });
      }
    }

    if (detalles.ventas.length > 0) {
      detalles.ventas.forEach((venta: any) => {
        const vDate = new Date(venta.created_at);
        if (filtroTiempo === '12m') {
          const vMes = vDate.getMonth();
          const vAño = vDate.getFullYear();
          const targetIndex = baseData.findIndex(b => b.mes === vMes && b.año === vAño);
          if (targetIndex !== -1) {
            baseData[targetIndex].ingresos += Number(venta.total || 0);
            baseData[targetIndex].cantidadVentas += 1;
          }
        } else {
          const vDateStr = vDate.toDateString();
          const targetIndex = baseData.findIndex(b => b.dateStr === vDateStr);
          if (targetIndex !== -1) {
            baseData[targetIndex].ingresos += Number(venta.total || 0);
            baseData[targetIndex].cantidadVentas += 1;
          }
        }
      });
    }

    const sumIngresos = baseData.reduce((acc, d) => acc + d.ingresos, 0);
    const sumVentas = baseData.reduce((acc, d) => acc + d.cantidadVentas, 0);
    const promIngresos = baseData.length > 0 ? sumIngresos / baseData.length : 0;
    const ticketPromedio = sumVentas > 0 ? sumIngresos / sumVentas : 0;

    return { chartData: baseData, sumIngresos, sumVentas, promIngresos, ticketPromedio };
  }, [detalles.ventas, filtroTiempo]);

  const renderizarAnalisis = () => {
    if (!modalActivo) return null;

    if (modalActivo === 'rendimiento') {
      const { chartData, sumIngresos, sumVentas, promIngresos, ticketPromedio } = datosGrafica;

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays size={16} /> Período de Análisis
            </h3>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#151515] p-1 rounded-xl border border-gray-200 dark:border-gray-800">
              <button onClick={() => setFiltroTiempo('7d')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filtroTiempo === '7d' ? 'bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>7 Días</button>
              <button onClick={() => setFiltroTiempo('30d')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filtroTiempo === '30d' ? 'bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>30 Días</button>
              <button onClick={() => setFiltroTiempo('12m')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filtroTiempo === '12m' ? 'bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>12 Meses</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><Wallet size={14} className="text-green-500"/> TOTAL INGRESOS</p>
              <p className="text-2xl font-black mt-1 text-green-600 dark:text-green-400">Q {sumIngresos.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><ShoppingCart size={14} className="text-orange-500"/> TOTAL ENTREGAS</p>
              <p className="text-2xl font-black mt-1 text-orange-600 dark:text-orange-400">{sumVentas}</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><TrendingUp size={14} className="text-blue-500"/> PROMEDIO DIARIO</p>
              <p className="text-2xl font-black mt-1 text-blue-600 dark:text-blue-400">Q {promIngresos.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><Receipt size={14} className="text-purple-500"/> TICKET PROMEDIO</p>
              <p className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">Q {ticketPromedio.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>

          <div className="h-80 w-full mt-6 bg-gray-50 dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 pt-8 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 30, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="fechaVisual" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} />
                
                <YAxis 
                  yAxisId="left" 
                  width={90} 
                  tick={{fill: '#10b981', fontSize: 11, fontWeight: 'bold'}} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `Q ${value.toLocaleString('es-GT')}`} 
                  domain={[0, (dataMax: any) => (dataMax === 0 ? 100 : dataMax * 1.2)]}
                />
                
                <YAxis 
                  yAxisId="right" 
                  width={40} 
                  orientation="right" 
                  tick={{fill: '#f97316', fontSize: 12, fontWeight: 'bold'}} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, (dataMax: any) => (dataMax === 0 ? 5 : Math.ceil(dataMax * 1.5))]}
                />
                
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid #333', color: '#fff' }} 
                  formatter={(value: any, name: any) => {
                    if (name === 'ingresos') return [`Q ${Number(value || 0).toLocaleString('es-GT', {minimumFractionDigits: 2})}`, 'Dinero Generado'];
                    if (name === 'cantidadVentas') return [value, 'Entregas Realizadas'];
                    return [value, name];
                  }} 
                />
                
                <Area yAxisId="left" type="natural" dataKey="ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                <Area yAxisId="right" type="natural" dataKey="cantidadVentas" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-bold mb-4 text-gray-500 uppercase tracking-wider">Historial Reciente</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-black/20 text-gray-500">
                  <tr><th className="p-3 font-bold">Fecha</th><th className="p-3 font-bold">Paciente</th><th className="p-3 font-bold">Producto</th><th className="p-3 font-bold text-right">Monto</th></tr>
                </thead>
                <tbody>
                  {detalles.ventas.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">No hay ventas registradas.</td></tr>
                  ) : (
                    detalles.ventas.slice(0, 5).map(v => (
                      <tr key={v.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-gray-500">{formatearFecha(v.created_at)}</td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">{v.clientes?.nombre || 'Desconocido'}</td>
                        <td className="p-3 text-gray-500">{v.productos?.nombre || 'Eliminado'}</td>
                        <td className="p-3 text-right font-bold text-gray-900 dark:text-gray-100">Q {Number(v.total).toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (modalActivo === 'alertas') {
      return (
        <div>
          <h3 className="text-lg font-bold mb-4 text-yellow-700 dark:text-yellow-500">Aviso de Resurtimiento</h3>
          {detalles.productosAlerta.length === 0 ? (
            <p className="text-gray-500">No hay productos en estado de alerta amarilla.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500">
                  <tr><th className="p-3 font-bold">Producto</th><th className="p-3 font-bold text-center">Stock Actual</th><th className="p-3 font-bold text-center">Mínimo Permitido</th></tr>
                </thead>
                <tbody>
                  {detalles.productosAlerta.map(p => (
                    <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="p-3 font-semibold dark:text-gray-200">{p.nombre}</td>
                      <td className="p-3 text-center text-yellow-600 font-bold">{p.stock}</td>
                      <td className="p-3 text-center text-gray-500">{p.stock_minimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (modalActivo === 'agotados') {
      return (
        <div>
          <h3 className="text-lg font-bold mb-4 text-red-700 dark:text-red-500">Emergencia: Stock en Cero</h3>
          {detalles.productosAgotados.length === 0 ? (
            <div className="p-8 text-center bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
              <Package className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-green-600 dark:text-green-400 font-bold">Excelente</p>
              <p className="text-sm text-gray-500 mt-1">Ningún medicamento está agotado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
                  <tr><th className="p-3 font-bold">Medicamento Agotado</th><th className="p-3 font-bold text-center">Lote Anterior</th><th className="p-3 font-bold text-center">Estado</th></tr>
                </thead>
                <tbody>
                  {detalles.productosAgotados.map(p => (
                    <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="p-3 font-bold dark:text-gray-200">{p.nombre}</td>
                      <td className="p-3 text-center text-gray-500 font-mono text-xs">{p.lote || 'N/A'}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                          0 UNIDADES
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (modalActivo === 'caducidad') {
      return (
        <div>
          <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-300">Control de Caducidades</h3>
          {detalles.productosCaducidad.length === 0 ? (
            <div className="p-8 text-center bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30">
              <Clock className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <p className="text-purple-600 dark:text-purple-400 font-bold">Inventario Saludable</p>
              <p className="text-sm text-gray-500 mt-1">Ningún medicamento vencerá en los próximos 90 días.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400">
                  <tr>
                    <th className="p-3 font-bold">Medicamento</th>
                    <th className="p-3 font-bold text-center">Lote</th>
                    <th className="p-3 font-bold text-center">Vencimiento</th>
                    <th className="p-3 font-bold text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.productosCaducidad.map(p => {
                    const dias = calcularDiasFaltantes(p.fecha_caducidad);
                    const vencido = dias < 0;
                    const venceHoy = dias === 0;
                    
                    return (
                      <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="p-3 font-semibold dark:text-gray-200">{p.nombre}</td>
                        <td className="p-3 text-center font-mono text-xs text-gray-500">{p.lote || 'N/A'}</td>
                        <td className="p-3 text-center font-bold text-gray-700 dark:text-gray-300">{formatearFecha(p.fecha_caducidad)}</td>
                        <td className="p-3 text-right">
                          {vencido || venceHoy ? (
                            <span className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                              {venceHoy ? '¡VENCE HOY!' : `Vencido hace ${Math.abs(dias)} días`}
                            </span>
                          ) : (
                            <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400">
                              Vence en {dias} días
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (modalActivo === 'clientes') {
      const mapaUbicaciones = detalles.ventas.reduce((acc: any, venta: any) => {
        const cliente = detalles.clientes.find(c => c.id === venta.cliente_id);
        const ubicacion = cliente?.direccion || "No Especificado";
        
        if (!acc[ubicacion]) {
          acc[ubicacion] = { nombre: ubicacion, monto: 0 };
        }
        acc[ubicacion].monto += Number(venta.total || 0);
        return acc;
      }, {});

      const datosDemograficos = Object.values(mapaUbicaciones)
        .sort((a: any, b: any) => b.monto - a.monto);

      return (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Demografía y Consumo</h3>

          {datosDemograficos.length > 0 ? (
            <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                <MapPin size={16} /> Inversión por Comunidad
              </h4>
              <div className="h-[350px] w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosDemograficos} margin={{ top: 30, right: 10, left: 20, bottom: 80 }}>
                    <defs>
                      <linearGradient id="colorComunidad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                    <XAxis dataKey="nombre" tick={{fill: '#888', fontSize: 11, fontWeight: 600}} angle={-45} textAnchor="end" tickLine={false} axisLine={false} />
                    
                    <YAxis 
                      width={90} 
                      tick={{fill: '#888', fontSize: 11}} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `Q ${value.toLocaleString('es-GT')}`}
                      domain={[0, (dataMax: any) => (dataMax === 0 ? 100 : dataMax * 1.2)]}
                    />
                    
                    <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: '12px', border: '1px solid #333', color: '#fff' }} itemStyle={{ color: '#10b981', fontWeight: 'bold' }} formatter={(value: any) => [`Q ${Number(value).toLocaleString('es-GT', {minimumFractionDigits: 2})}`, 'Inversión']} />
                    <Area type="natural" dataKey="monto" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorComunidad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p className="text-gray-500 font-bold">Aún no hay entregas registradas para graficar el consumo por comunidades.</p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Directorio Reciente</h4>
            {detalles.clientes.length === 0 ? (
              <p className="text-gray-500">No hay pacientes en el directorio.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <tr>
                      <th className="p-3 font-bold">Nombre</th>
                      <th className="p-3 font-bold">Comunidad</th>
                      <th className="p-3 font-bold">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.clientes.slice(0, 10).map(c => (
                      <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="p-3 font-semibold dark:text-gray-200">{c.nombre}</td>
                        <td className="p-3 text-gray-500 font-medium">{c.direccion || 'No Especificado'}</td>
                        <td className="p-3 text-gray-500">{c.telefono}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="p-8 w-full max-w-7xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-200 min-h-screen relative">
      
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-2">Panel de Control</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">Bienvenido al resumen operativo de tu negocio.</p>
      </div>

      {/* METRICAS SUPERIORES - 5 COLUMNAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
        
        <button onClick={() => setModalActivo('rendimiento')} className="text-left w-full bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:ring-4 hover:ring-blue-500/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform"><Activity size={24} /></div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Desempeño General</h3>
          </div>
          <div className="min-h-[36px]">
            {cargando ? (
              <Skeleton className="h-9 w-32 bg-gray-200 dark:bg-gray-700/50" />
            ) : (
              <p className="text-3xl font-black transition-colors text-gray-900 dark:text-white">
                Q {metricas.ingresos.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            )}
          </div>
          <div className="min-h-[20px] mt-1">
            {cargando ? (
              <Skeleton className="h-5 w-24 bg-gray-200 dark:bg-gray-700/50" />
            ) : (
              <p className="text-sm font-bold text-orange-500 dark:text-orange-400">
                {metricas.totalVentas} Entregas
              </p>
            )}
          </div>
        </button>

        <button onClick={() => setModalActivo('clientes')} className="text-left w-full bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:ring-4 hover:ring-emerald-500/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Pacientes</h3>
          </div>
          <div className="min-h-[36px]">
            {cargando ? (
              <Skeleton className="h-9 w-20 bg-gray-200 dark:bg-gray-700/50" />
            ) : (
              <p className="text-3xl font-black transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                {metricas.totalClientes}
              </p>
            )}
          </div>
        </button>

        <button onClick={() => setModalActivo('alertas')} className="text-left w-full bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:ring-4 hover:ring-yellow-500/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><AlertTriangle size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-2xl group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Poco Stock</h3>
          </div>
          <div className="min-h-[36px]">
            {cargando ? (
              <Skeleton className="h-9 w-20 bg-gray-200 dark:bg-gray-700/50" />
            ) : (
              <p className="text-3xl font-black text-yellow-500 transition-colors group-hover:text-yellow-600 dark:group-hover:text-yellow-400">
                {metricas.alertasStock}
              </p>
            )}
          </div>
        </button>

        <button onClick={() => setModalActivo('agotados')} className="text-left w-full bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:ring-4 hover:ring-red-500/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><AlertOctagon size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl group-hover:scale-110 transition-transform"><AlertOctagon size={24} /></div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Agotados</h3>
          </div>
          <div className="min-h-[36px]">
            {cargando ? (
              <Skeleton className="h-9 w-20 bg-gray-200 dark:bg-gray-700/50" />
            ) : (
              <p className="text-3xl font-black text-red-600 transition-colors group-hover:text-red-700 dark:group-hover:text-red-500">
                {metricas.agotados}
              </p>
            )}
          </div>
        </button>

        <button onClick={() => setModalActivo('caducidad')} className="text-left w-full bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:ring-4 hover:ring-purple-500/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Clock size={80} /></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform"><Clock size={24} /></div>
            <h3 className="font-bold text-gray-500 dark:text-gray-400">Por Vencer</h3>
          </div>
          <div className="min-h-[36px]">
            {cargando ? (
              <Skeleton className="h-9 w-20 bg-gray-200 dark:bg-gray-700/50" />
            ) : (
              <p className="text-3xl font-black text-purple-500 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                {metricas.alertasCaducidad}
              </p>
            )}
          </div>
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-6">Módulos del Sistema</h2>

      {/* AHORA SON 4 COLUMNAS PARA QUE QUEPAN LOS 4 MÓDULOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* MÓDULO 1: INVENTARIO */}
        <Link href="/kore/productos" className="group block p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 opacity-20 group-hover:scale-125 transition-transform duration-500"><Package size={140} /></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/30"><Package size={28} /></div>
            <h3 className="text-2xl font-black mb-2">Inventario</h3>
            <p className="text-blue-100 mb-8 max-w-[90%]">Administra productos, precios y supervisa las alertas de existencias.</p>
            <div className="flex items-center gap-2 font-bold text-white group-hover:gap-4 transition-all">Ir al módulo <ArrowRight size={20} /></div>
          </div>
        </Link>
        
        {/* MÓDULO 2: DIRECTORIO CLINICO */}
        <Link href="/kore/clientes" className="group block p-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl text-white shadow-xl shadow-emerald-500/20 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 opacity-20 group-hover:scale-125 transition-transform duration-500"><Users size={140} /></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/30"><Users size={28} /></div>
            <h3 className="text-2xl font-black mb-2">Expedientes</h3>
            <p className="text-emerald-100 mb-8 max-w-[90%]">Gestiona la información de pacientes y su historial clínico al día.</p>
            <div className="flex items-center gap-2 font-bold text-white group-hover:gap-4 transition-all">Ir al módulo <ArrowRight size={20} /></div>
          </div>
        </Link>
        
        {/* NUEVO MÓDULO 3: SALA DE ESPERA (TURNOS) - COLOR VIOLETA */}
        <Link href="/kore/turnos" className="group block p-8 bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl text-white shadow-xl shadow-purple-500/20 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 opacity-20 group-hover:scale-125 transition-transform duration-500"><Stethoscope size={140} /></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/30"><Stethoscope size={28} /></div>
            <h3 className="text-2xl font-black mb-2">Sala de Espera</h3>
            <p className="text-purple-100 mb-8 max-w-[90%]">Controla el flujo de pacientes y turnos de atención médica.</p>
            <div className="flex items-center gap-2 font-bold text-white group-hover:gap-4 transition-all">Ir al módulo <ArrowRight size={20} /></div>
          </div>
        </Link>

        {/* MÓDULO 4: DISPENSACIÓN */}
        <Link href="/kore/ventas" className="group block p-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl text-white shadow-xl shadow-orange-500/20 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 opacity-20 group-hover:scale-125 transition-transform duration-500"><ShoppingCart size={140} /></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/30"><ShoppingCart size={28} /></div>
            <h3 className="text-2xl font-black mb-2">Dispensación</h3>
            <p className="text-orange-100 mb-8 max-w-[90%]">Registra entregas de medicamentos y actualiza el stock automáticamente.</p>
            <div className="flex items-center gap-2 font-bold text-white group-hover:gap-4 transition-all">Ir al módulo <ArrowRight size={20} /></div>
          </div>
        </Link>
        
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className={`p-6 text-white flex justify-between items-center ${
              modalActivo === 'alertas' ? 'bg-yellow-600' : 
              modalActivo === 'agotados' ? 'bg-red-600' : 
              modalActivo === 'caducidad' ? 'bg-purple-600' : 
              modalActivo === 'rendimiento' ? 'bg-blue-600' :
              modalActivo === 'clientes' ? 'bg-emerald-600' : 'bg-gray-800'
            }`}>
              <h2 className="text-2xl font-extrabold flex items-center gap-3">
                {modalActivo === 'alertas' && <><AlertTriangle /> Reporte de Resurtimiento</>}
                {modalActivo === 'agotados' && <><AlertOctagon /> Reporte de Emergencia (Stock 0)</>}
                {modalActivo === 'caducidad' && <><Clock /> Control de Caducidades</>}
                {modalActivo === 'rendimiento' && <><Activity /> Resumen Financiero y Operativo</>}
                {modalActivo === 'clientes' && <><Users /> Demografía de Pacientes</>}
              </h2>
              <button onClick={() => setModalActivo(null)} className="bg-black/20 hover:bg-black/30 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto bg-white dark:bg-[#1E1E1E]">
              {renderizarAnalisis()}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#151515] border-t border-gray-100 dark:border-gray-800 text-center">
              <button onClick={() => setModalActivo(null)} className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                Cerrar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}