"use client";

// CONTEXTO DE USUARIO Y ROL

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client"; // Asegúrate de tener este cliente

interface UserContextValue {
  user: User | null;
  simulatedRole: string | null;
  setSimulatedRole: (role: string | null) => void;
  effectiveRole: string;
  realRole: string;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  simulatedRole: null,
  setSimulatedRole: () => {},
  effectiveRole: "user",
  realRole: "user",
});

// PROVIDER

export function UserProvider({
  user: initialUser,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfileRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setProfileRole(null);
      return;
    }
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("rol")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("UserProvider: Error al obtener perfil:", JSON.stringify(error));
        } else if (data) {
          setProfileRole(data.rol);
        }
      } catch (err) {
        console.error("UserProvider: Error inesperado al obtener perfil:", err);
      }
    };
    fetchProfile();
  }, [user, supabase]);

  const metadata = user?.user_metadata || {};
  const realRole = profileRole || metadata.rol || user?.role || "authenticated";
  const effectiveRole = simulatedRole || realRole;


  return (
    <UserContext.Provider value={{ user, simulatedRole, setSimulatedRole, effectiveRole, realRole }}>
      {children}
    </UserContext.Provider>
  );
}

// HOOKS

export const useUser = () => {
  const ctx = useContext(UserContext);
  return ctx.user;
};

export const useUserContext = () => {
  return useContext(UserContext);
};
