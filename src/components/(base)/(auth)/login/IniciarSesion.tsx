"use client";

import { useState, useEffect, useActionState } from "react";
import { login, getPublicAppSettings, type ActionState } from "./actions";
import { getPasskeyOptions, verifyPasskey } from "./passkeys/passkeys-actions";
import { startAuthentication } from "@simplewebauthn/browser";
import { MagicCard } from "@/components/ui/magic-card";
import { Eye, EyeOff, ArrowBigUpDash } from "lucide-react";
import { LogIn as LogInIcon, ArrowRight, Fingerprint, ScanFace } from "lucide";
import { cn } from "@/lib/utils";
import { AuroraText } from "@/components/ui/aurora-text";
import { Skeleton } from "@/components/ui/skeleton";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { toast } from "react-toastify";

export default function IniciarSesion() {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasskeyPending, setIsPasskeyPending] = useState<boolean>(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [isPasskeysEnabled, setIsPasskeysEnabled] = useState<boolean>(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const handleKeyUpDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState("CapsLock"));
  };

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    login,
    null,
  );

  const showError = (message: string) => {
    toast.error(message);
  };

  useEffect(() => {
    setMounted(true);
    getPublicAppSettings().then((settings) => {
      const passkeysEnabled = settings?.enable_passkeys ?? false;
      const hasLocalPasskey =
        localStorage.getItem("cermad-device-passkey-enabled") === "true";

      const shouldShowPasskeys = passkeysEnabled && hasLocalPasskey;
      setIsPasskeysEnabled(shouldShowPasskeys);
      if (!shouldShowPasskeys) {
        setShowCredentials(true);
      }
      setIsLoadingSettings(false);
    });
  }, []);

  useEffect(() => {
    if (state?.success) {
      window.location.href = "/farmacia-la-salud";
    } else if (state?.message === "DEVICE_LIMIT") {
      window.location.href = "/esperando-acceso?reason=limit";
    } else if (state?.message === "DEVICE_PENDING") {
      window.location.href = "/esperando-acceso";
    } else if (state?.message) {
      showError(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handlePasskeyLogin = async () => {
    setIsPasskeyPending(true);
    try {
      const options = await getPasskeyOptions();
      const asseResp = await startAuthentication({ optionsJSON: options });
      const verification = await verifyPasskey(asseResp);

      if (verification.success) {
        localStorage.setItem("cermad-device-passkey-enabled", "true");
        window.location.href = "/farmacia-la-salud";
      } else if (verification.error === "DEVICE_LIMIT") {
        window.location.href = "/esperando-acceso?reason=limit";
      } else if (verification.error === "DEVICE_PENDING") {
        window.location.href = "/esperando-acceso";
      } else if (verification.error) {
        showError(verification.error);
      }
    } catch (error: unknown) {
      const err = error as Error;
      const msg = err.message || "";
      if (
        err.name === "NotAllowedError" ||
        err.name === "AbortError" ||
        msg.includes("timed out") ||
        msg.includes("not allowed")
      ) {
        return;
      }
      showError("Fallo en la biometría o tiempo excedido.");
    } finally {
      setIsPasskeyPending(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center w-full bg-transparent z-0 overflow-hidden">
      <div className="relative w-full max-w-md px-6 md:px-12 pb-12 z-10">
        <MagicCard className="rounded-3xl border border-[#C1D1C5]/40 dark:border-[#525D53]/50 bg-white/40 dark:bg-[#1a1d1a]/95 backdrop-blur-xl shadow-2xl overflow-visible!">
          <div className="flex flex-col items-center space-y-6 p-10 border-b border-border/50 text-center">
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight">
                <AuroraText>Bienvenido de nuevo</AuroraText>
              </h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
                FARMACIA SALUD
              </p>
            </div>
          </div>

          {isLoadingSettings ? (
            <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500">
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-xl mt-4" />
            </div>
          ) : (
            <form
              action={formAction}
              className={cn(
                "transition-all duration-500 flex flex-col",
                showCredentials ? "gap-6 p-10" : "gap-0 px-10 pb-10 pt-8",
              )}
            >
              <div
                className={cn(
                  "grid transition-all duration-500 ease-in-out",
                  showCredentials
                    ? "grid-rows-[1fr] opacity-100 mb-6"
                    : "grid-rows-[0fr] opacity-0 pointer-events-none mb-0",
                )}
              >
                <div className="overflow-hidden p-2 -m-2 flex flex-col gap-6">
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-foreground/70">
                      Usuario
                    </label>
                    <input
                      id="username"
                      type="text"
                      placeholder="Tu usuario"
                      required={showCredentials}
                      value={username}
                      className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                      Contraseña
                      {isCapsLockOn && (
                        <span className="text-[10px] text-amber-500 font-bold uppercase animate-pulse">
                          Mayúsculas activadas
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      {isCapsLockOn && (
                        <div
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none"
                          title="Mayúsculas activadas"
                        >
                          <ArrowBigUpDash className="size-4" />
                        </div>
                      )}
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required={showCredentials}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyUpDown}
                        onKeyUp={handleKeyUpDown}
                        className={cn(
                          "flex h-10 w-full rounded-lg border border-input bg-background/50 py-2 text-sm pr-10 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                          isCapsLockOn ? "pl-9" : "pl-3",
                        )}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {showCredentials ? (
                  <SigetActionButton
                    label="Entrar"
                    accentColor={sigetAccent.guardar}
                    morphFrom={LogInIcon}
                    morphTo={ArrowRight}
                    type="submit"
                    disabled={isPending || isPasskeyPending}
                    ariaBusy={isPending}
                    className="w-full"
                  />
                ) : (
                  <SigetActionButton
                    label="Ingresar"
                    accentColor={sigetAccent.guardar}
                    morphFrom={LogInIcon}
                    morphTo={ArrowRight}
                    onClick={() => setShowCredentials(true)}
                    disabled={isPasskeyPending}
                    className="w-full"
                  />
                )}

                {isPasskeysEnabled && (
                  <>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                        <span className="bg-card px-3 text-muted-foreground/70">
                          O
                        </span>
                      </div>
                    </div>

                    <SigetActionButton
                      label={isPasskeyPending ? "Esperando" : "Biometría"}
                      accentColor={sigetAccent.abrir}
                      morphFrom={Fingerprint}
                      morphTo={ScanFace}
                      onClick={handlePasskeyLogin}
                      disabled={isPending || isPasskeyPending}
                      ariaBusy={isPasskeyPending}
                      className="w-full"
                    />
                  </>
                )}
              </div>
            </form>
          )}
        </MagicCard>
      </div>
    </div>
  );
}
