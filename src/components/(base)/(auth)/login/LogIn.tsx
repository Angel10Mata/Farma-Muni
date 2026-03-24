"use client";

import Link from "next/link";
import { useState, useEffect, useActionState } from "react";
import { useTheme } from "next-themes";
import { login, type ActionState } from "./actions";
import { MagicCard } from "@/components/ui/magic-card";
import { Dock, DockIcon } from "@/components/ui/dock";
import { HomeIcon, Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuroraText } from "@/components/ui/aurora-text";

const Label = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    {...props}
    className={cn(
      "text-sm font-semibold leading-none text-foreground/70",
      className,
    )}
  />
);

const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      "flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
      className,
    )}
  />
);

const Button = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:opacity-90 h-11 px-8 cursor-pointer active:scale-[0.98]  disabled:opacity-50 disabled:cursor-wait",
      className,
    )}
  />
);

export default function LogIn() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    login,
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDebug = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    console.clear();
    console.log(
      "%c--- DEBUG CREDENCIALES ---",
      "color: #00ff00; font-weight: bold;",
    );
    console.log("Usuario (State):", username);
    console.log("Email (Hidden Input):", formData.get("email"));
    console.log("Contraseña:", formData.get("password"));
    console.log(
      "%c--------------------------",
      "color: #00ff00; font-weight: bold;",
    );
  };

  if (!mounted) return null;

  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col items-center justify-center p-4 pb-32">
        <div className="w-full max-w-md z-10">
          <MagicCard className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl">
            <div className="flex flex-col items-center space-y-6 p-10 border-b border-border/50 text-center">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight">
                  <AuroraText>Bienvenido de nuevo</AuroraText>
                </h3>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                  Inicia sesión para continuar
                </p>
              </div>
            </div>

            <form
              action={formAction}
              onSubmit={handleDebug}
              className="p-10 space-y-6"
            >
              <div className="grid gap-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Tu usuario"
                  required
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().trim())
                  }
                />
                <input
                  type="hidden"
                  name="email"
                  value={username ? `${username}@app.com` : ""}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="pr-10"
                    defaultValue={state?.fields?.password}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={isPending}
                >
                  {isPending ? "Verificando..." : "Iniciar Sesión"}
                </Button>

                {state?.message && (
                  <div
                    className={cn(
                      "mt-4 flex items-center gap-2 rounded-lg border p-3 text-[11px] animate-in fade-in slide-in-from-top-1 duration-300",
                      state.errorType === "invalid"
                        ? "border-destructive/20 bg-destructive/10 text-destructive"
                        : "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
                    )}
                  >
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{state.message}</p>
                  </div>
                )}
              </div>
            </form>
          </MagicCard>
        </div>
      </div>

      <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <Dock
            direction="middle"
            iconSize={32}
            iconMagnification={45}
            className="h-12 border-border/40 bg-background/60 backdrop-blur-md"
          >
            <Link href="/">
              <DockIcon>
                <HomeIcon className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
              </DockIcon>
            </Link>
          </Dock>
        </div>
      </div>
    </main>
  );
}
