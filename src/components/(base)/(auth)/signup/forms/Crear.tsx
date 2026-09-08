"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MagicCard } from "@/components/ui/magic-card";
import {
  X,
  Eye,
  EyeOff,
  Wand2,
  UserPlus,
  ClipboardCopy,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";
import {
  UserPlus as UserPlusNode,
  Check as CheckNode,
  Send as SendNode,
  ArrowLeft as ArrowLeftNode,
  MessageCircle as MessageCircleNode,
} from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { cn } from "@/lib/utils";
import { useSignupLogic } from "../hooks";
import { AnimatePresence, motion } from "framer-motion";
import { generateStrongPassword } from "@/utils/general/password-generator";
import { AuroraText } from "@/components/ui/aurora-text";
import { useUser } from "@/components/(base)/providers/UserProvider";

interface SignUpProps {
  isOpen: boolean;
  onClose: () => void;
}

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
      "flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all outline-none",
      className,
    )}
  />
);

const Select = ({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select
      {...props}
      className={cn(
        "flex h-10 w-full appearance-none rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none cursor-pointer",
        className,
      )}
    />
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 1L5 5L9 1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  </div>
);

export default function FormularioRegistro({ isOpen, onClose }: SignUpProps) {
  const logic = useSignupLogic();
  const currentUser = useUser();
  const currentUserRole = currentUser?.user_metadata?.rol || "user";
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [isUsernameEdited, setIsUsernameEdited] = useState(false);
  const [savedData, setSavedData] = useState({ user: "", pass: "" });
  const hasMovedToStep2 = useRef(false);

  const suggestedUsername = useMemo(() => {
    if (logic.name.trim().length > 3) {
      const cleanName = logic.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z ]/g, "");
      const connectors = ["de", "del", "la", "las", "los", "y", "el"];
      const parts = cleanName
        .split(" ")
        .filter((p) => p.length > 0 && !connectors.includes(p));
      if (parts.length >= 2) {
        const initial = parts[0][0];
        const surname = parts.length >= 3 ? parts[2] : parts[1];
        return initial + surname;
      } else if (parts.length === 1) {
        return parts[0];
      }
    }
    return "";
  }, [logic.name]);

  const resetForm = () => {
    const pass = generateStrongPassword();
    logic.setName("");
    logic.setUsername("");
    logic.setPasswordValue(pass);
    logic.setRol("user");
    logic.setShowPassword(false);
    setPhoneNumber("");
    setCopied(false);
    setIsUsernameEdited(false);
    setStep(1);
    setSavedData({ user: "", pass: "" });
    hasMovedToStep2.current = false;
  };

  useEffect(() => {
    if (isOpen) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (logic.state?.success && !hasMovedToStep2.current) {
      setSavedData({ user: logic.username, pass: logic.passwordValue });
      hasMovedToStep2.current = true;
      setStep(2);
    }
  }, [logic.state?.success, logic.username, logic.passwordValue]);
  const handleCopy = () => {
    const textToCopy = `*CREDENCIALES DE ACCESO*\n\n*Usuario:* ${savedData.user}\n*Contraseña:* ${savedData.pass}\n\n_Por seguridad, cambie su clave al ingresar_`;

    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;

    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      }
    } catch (err) {
      console.error("Fallo al copiar:", err);
    }

    document.body.removeChild(textArea);
  };

  const handleWhatsApp = () => {
    if (phoneNumber.length === 8) {
      const msg = `*CREDENCIALES DE ACCESO*\n\n*Usuario:* ${savedData.user}\n*Contraseña:* ${savedData.pass}\n\n_Por seguridad, cambie su clave al ingresar._`;
      window.open(
        `https://wa.me/502${phoneNumber}?text=${encodeURIComponent(msg)}`,
        "_blank",
      );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md relative"
        >
          <MagicCard className="rounded-3xl border border-border/50 bg-white dark:bg-black shadow-none overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/5">
              <div className="flex items-center gap-4">
                <UserPlus size={30} className="text-primary" />
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    Nuevo Usuario
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    Configuración de acceso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 overflow-hidden min-h-105">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.form
                    key="step1"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    action={logic.formAction}
                    className="space-y-5"
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="ej. Juan Pérez"
                        value={logic.name}
                        onChange={(e) => logic.setName(e.target.value)}
                        className={cn(
                          logic.state?.errors?.name &&
                            "border-destructive ring-1 ring-destructive",
                        )}
                      />
                      {logic.state?.errors?.name && (
                        <p className="text-[10px] text-destructive font-bold px-1 italic">
                          {logic.state.errors.name[0]}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="username"
                          className="flex items-center gap-1"
                        >
                          Usuario
                          {suggestedUsername && (
                            <>
                              <span className="text-muted-foreground font-normal ml-1 border-l border-border pl-2">Sugerido:</span>{" "}
                              <button
                                type="button"
                                onClick={() => {
                                  logic.setUsername(suggestedUsername);
                                  setIsUsernameEdited(true);
                                }}
                                className="group/sug flex items-center gap-1.5 transition-opacity cursor-pointer"
                              >
                                <AuroraText className="text-sm font-black lowercase opacity-80 group-hover/sug:opacity-100 transition-opacity">
                                  {suggestedUsername}
                                </AuroraText>
                                <Wand2
                                  size={14}
                                  className="text-primary/70 group-hover/sug:text-primary transition-all group-hover/sug:scale-110 rotate-[15deg]"
                                />
                                
                              </button>
                            </>
                          )}
                        </Label>
                      </div>
                      <Input
                        id="username"
                        name="username"
                        placeholder="ej. jperz"
                        value={logic.username}
                        onChange={(e) => {
                          logic.setUsername(e.target.value);
                          if (!isUsernameEdited) setIsUsernameEdited(true);
                        }}
                        className={cn(
                          logic.state?.errors?.username &&
                            "border-destructive ring-1 ring-destructive",
                        )}
                      />
                      {logic.state?.errors?.username && (
                        <p className="text-[10px] text-destructive font-bold px-1 italic">
                          {logic.state.errors.username[0]}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="rol">Rol</Label>
                      <Select
                        id="rol"
                        name="rol"
                        value={logic.rol}
                        onChange={(e) => logic.setRol(e.target.value)}
                      >
                        <option value="user">Usuario (Estándar)</option>
                        <option value="admin">Administrador</option>
                        {currentUserRole === "super" && (
                          <option value="super">Super Admin</option>
                        )}
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        <div className="flex items-center gap-1.5 animate-pulse">
                          <AuroraText className="text-sm font-bold">
                            Autogenerada
                          </AuroraText>
                          <Wand2
                            size={14}
                            className="text-primary rotate-[15deg]"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={logic.showPassword ? "text" : "password"}
                          value={logic.passwordValue}
                          onChange={(e) => logic.setPasswordValue(e.target.value)}
                          className={cn(
                            "pr-10 bg-muted/20 font-mono border-dashed transition-all",
                            logic.state?.errors?.password &&
                              "border-destructive ring-1 ring-destructive",
                            !logic.showPassword && "tracking-[0.15em]",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            logic.setShowPassword(!logic.showPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1 cursor-pointer"
                        >
                          {logic.showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      {logic.state?.errors?.password && (
                        <div className="text-[10px] text-destructive font-bold px-1 italic space-y-0.5">
                          {logic.state.errors.password.map((err, i) => (
                            <p key={i}>{err}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {logic.state?.message && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold animate-shake">
                        {logic.state.message}
                      </div>
                    )}

                    <SigetActionButton
                      label={logic.isPending ? "Creando" : "Crear"}
                      accentColor={sigetAccent.crear}
                      morphFrom={UserPlusNode}
                      morphTo={CheckNode}
                      type="submit"
                      disabled={logic.isPending}
                      ariaBusy={logic.isPending}
                      className="w-auto shrink-0"
                    />
                  </motion.form>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="p-5 rounded-2xl border border-border/60 bg-muted/30 space-y-5">
                      <div className="flex justify-between items-center border-b border-border/40 pb-4">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">
                          Credenciales generadas
                        </span>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-bold transition-all cursor-pointer"
                          >
                            <ClipboardCopy size={14} />
                            Copiar datos
                          </button>

                          <AnimatePresence>
                            {copied && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: -45, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="absolute left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded shadow-xl font-bold whitespace-nowrap z-10"
                              >
                                ¡Copiado!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase opacity-70">
                            Usuario:
                          </span>
                          <span className="text-sm font-bold">
                            {savedData.user}
                          </span>
                          
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase opacity-70">
                            Contraseña:
                          </span>
                          <code className="text-sm font-mono text-foreground bg-background/80 px-2 py-1 rounded border border-border/40 tracking-wider shadow-sm">
                            {savedData.pass}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest">
                        Enviar por WhatsApp
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="Número de 8 dígitos"
                          value={phoneNumber}
                          onChange={(e) =>
                            setPhoneNumber(
                              e.target.value.replace(/\D/g, "").slice(0, 8),
                            )
                          }
                        />
                        <SigetActionButton
                          label="Enviar"
                          accentColor={sigetAccent.abrir}
                          morphFrom={SendNode}
                          morphTo={MessageCircleNode}
                          onClick={handleWhatsApp}
                          disabled={phoneNumber.length !== 8}
                          className="w-auto shrink-0"
                        />
                      </div>
                    </div>

                    <SigetActionButton
                      label="Volver"
                      accentColor={sigetAccent.cancelar}
                      morphFrom={ArrowLeftNode}
                      morphTo={ArrowLeftNode}
                      morphOnHover={false}
                      onClick={resetForm}
                      className="w-auto shrink-0"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </MagicCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
