"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Lock, Mail, ArrowRight, ShieldCheck, Building2 } from "lucide-react";
import Swal from "sweetalert2";

function FormularioLogin() {
  // Revertimos a 'email' para que el usuario ingrese su dirección completa
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const mensaje = searchParams.get("message");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const supabase = createClient();

    // Ahora enviamos el email tal cual lo escribe el usuario
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (error) {
      Swal.fire({
        title: 'Acceso Denegado',
        text: 'El correo electrónico o la contraseña son incorrectos.',
        icon: 'error',
        confirmButtonColor: '#10b981',
        background: document.documentElement.classList.contains('dark') ? '#1E1E1E' : '#FFFFFF',
        color: document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000',
      });
      setLoading(false);
    } else {
      router.push("/kore");
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
      
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-center relative overflow-hidden">
        <ShieldCheck className="absolute -top-4 -right-4 text-white/10 w-32 h-32 rotate-12 pointer-events-none" />
        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-inner">
          <Building2 size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight leading-none">Farma-Muni</h2>
        <p className="text-emerald-100 text-xs mt-2 font-bold uppercase tracking-widest">Portal Institucional</p>
      </div>

      <form onSubmit={handleLogin} className="p-8 space-y-5">
        
        {mensaje && (
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 p-3 rounded-xl text-xs text-center font-bold border border-amber-100 dark:border-amber-900/30">
            {mensaje}
          </div>
        )}

        {/* CAMPO: CORREO ELECTRÓNICO */}
        <div>
          <label className="block mb-1.5 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
            Correo Electrónico
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white font-medium" 
              placeholder="usuario@ejemplo.com" 
              required 
            />
          </div>
        </div>

        {/* CAMPO: CONTRASEÑA */}
        <div>
          <label className="block mb-1.5 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
            Contraseña
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white" 
              placeholder="••••••••" 
              required 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className={`w-full py-4 rounded-2xl text-lg font-black text-white transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 mt-2 ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading ? (
            <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Ingresar al Sistema <ArrowRight size={20} /></>
          )}
        </button>

        <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Gobierno Municipal • 2026
          </p>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-gray-50 dark:bg-[#0F0F0F] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <Suspense fallback={<div className="text-emerald-600 font-black animate-pulse tracking-tighter">CARGANDO...</div>}>
        <FormularioLogin />
      </Suspense>
    </main>
  );
}