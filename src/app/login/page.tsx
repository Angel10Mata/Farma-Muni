"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Lock, User, ArrowRight, ShieldCheck, Building2 } from "lucide-react";
import Swal from "sweetalert2";

function FormularioLogin() {
  const [usuario, setUsuario] = useState(""); // Cambiamos email por usuario
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const mensaje = searchParams.get("message");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const supabase = createClient();

    // LÓGICA DE USUARIO: Agregamos el dominio invisible por detrás
    const emailCompleto = `${usuario.trim().toLowerCase()}@farma.muni`;

    const { error } = await supabase.auth.signInWithPassword({
      email: emailCompleto,
      password,
    });

    if (error) {
      Swal.fire({
        title: 'Acceso Denegado',
        text: 'Usuario o contraseña incorrectos.',
        icon: 'error',
        confirmButtonColor: '#10b981'
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
        <h2 className="text-2xl font-black text-white tracking-tight">Farma-Muni Control</h2>
        <p className="text-emerald-100 text-sm mt-1 font-medium">Portal de Acceso Municipal</p>
      </div>

      <form onSubmit={handleLogin} className="p-8 space-y-6">
        
        {mensaje && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-bold border border-red-100">
            {mensaje}
          </div>
        )}

        <div>
          <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Nombre de Usuario</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-emerald-500" />
            </div>
            <input 
              type="text" 
              value={usuario} 
              onChange={(e) => setUsuario(e.target.value)} 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/50 outline-none transition-all dark:text-white" 
              placeholder="Ej: admin, farmacia, doctor" 
              required 
            />
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Contraseña</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-emerald-500" />
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-gray-100 dark:border-gray-800 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/50 outline-none transition-all dark:text-white" 
              placeholder="••••••••" 
              required 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className={`w-full py-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-4 ${loading ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"}`}
        >
          {loading ? "Verificando..." : <>Entrar al Sistema <ArrowRight size={20} /></>}
        </button>

        <p className="text-center text-xs text-gray-400 font-medium pt-4">
          Identifíquese con sus credenciales autorizadas.
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-gray-100 dark:bg-[#121212] flex items-center justify-center p-4 relative">
      <Suspense fallback={<div className="text-emerald-600 font-bold animate-pulse">Cargando...</div>}>
        <FormularioLogin />
      </Suspense>
    </main>
  );
}