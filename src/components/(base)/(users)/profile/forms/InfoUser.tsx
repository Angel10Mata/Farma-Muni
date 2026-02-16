"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Shield,
  Wand2,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ClipboardCopy,
  MessageCircle,
  ArrowLeft,
  UserX,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import Swal from "sweetalert2";
import { profileObjectSchema } from "../lib/schemas";
import { useUserCredentials, useCredentialsMutation } from "../lib/hooks";
import { toggleUserStatus } from "../lib/actions";
import { useUser } from "@/components/(base)/providers/UserProvider";
import { cn } from "@/lib/utils";
import { generateStrongPassword } from "@/utils/general/password-generator";
import { AuroraText } from "@/components/ui/aurora-text";
import { AnimatePresence, motion } from "framer-motion";

// --- SUB-COMPONENT: SWITCH PERSONALIZADO ---
const StatusSwitch = ({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onCheckedChange(!checked)}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      checked ? "bg-green-600" : "bg-zinc-300 dark:bg-zinc-600",
    )}
  >
    <span
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
        checked ? "translate-x-4" : "translate-x-0",
      )}
    />
  </button>
);

// --- SUB-COMPONENT: TOGGLE DE ESTADO ---
const UserStatusToggle = ({
  userId,
  isBanned,
  onStatusChange,
  canEdit,
}: {
  userId: string;
  isBanned: boolean;
  onStatusChange: () => void;
  canEdit: boolean;
}) => {
  const user = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const currentUserRole = user?.user_metadata?.rol;
  const isSelf = user?.id === userId;
  const hasPermission = ["super", "admin"].includes(currentUserRole || "");

  if (!hasPermission) return null;

  const handleToggle = async (shouldBan: boolean) => {
    if (isLoading || isSelf || !canEdit) return;
    setIsLoading(true);
    try {
      const result = await toggleUserStatus(userId, shouldBan);
      if (result.success) onStatusChange();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = !isBanned;

  return (
    <div className="py-10">
      <div className="flex justify-between items-end mb-2">
        {isSelf ? (
          <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
            <AlertTriangle size={12} /> No puedes banear tu propio perfil
          </span>
        ) : (
          <span className="text-xs font-semibold leading-none text-foreground/70">
            {isActive
              ? "Acceso permitido al sistema"
              : "Inicio de sesión bloqueado"}
          </span>
        )}
      </div>

      <div
        className={cn(
          "flex items-center justify-between w-full rounded-lg border border-input bg-background/50 px-3 py-2 transition-all",
          isSelf && "opacity-80 bg-muted/20",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-1.5 rounded-full shrink-0 transition-colors",
              isActive
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400",
            )}
          >
            {isActive ? <UserCheck size={16} /> : <UserX size={16} />}
          </div>

          <div className="flex flex-col">
            <span
              className={cn(
                "text-xs font-bold",
                isActive
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400",
              )}
            >
              {isActive ? "Usuario Activo" : "Usuario Bloqueado"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          )}
          <StatusSwitch
            checked={isActive}
            onCheckedChange={(val) => handleToggle(!val)}
            disabled={!canEdit || isLoading || isSelf}
          />
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
interface InfoUserProps {
  userId: string;
  canEdit: boolean;
  isSuper: boolean;
}

export function InfoUser({ userId, canEdit }: InfoUserProps) {
  const { theme } = useTheme();
  const { credentials, loading, refetch } = useUserCredentials(userId);
  const mutation = useCredentialsMutation();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [savedData, setSavedData] = useState({ user: "", pass: "" });

  useEffect(() => {
    if (credentials) {
      setFormData({
        username: credentials.username || "",
        newPassword: "",
        confirmPassword: "",
      });
      setHasChanges(false);
    }
  }, [credentials]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const { name, value } = e.target;
    const val =
      name === "username"
        ? value.toLowerCase().replace(/[^a-z0-9]/g, "")
        : value;

    setFormData((prev) => ({ ...prev, [name]: val }));
    setHasChanges(true);
    if (errors[name])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handleSave = async () => {
    const valid = profileObjectSchema
      .pick({ username: true, newPassword: true, confirmPassword: true })
      .refine(
        (data) =>
          !data.newPassword || data.newPassword === data.confirmPassword,
        { path: ["confirmPassword"] },
      )
      .safeParse(formData);

    if (!valid.success) {
      const fieldErrors: Record<string, string> = {};
      valid.error.issues.forEach((i) => {
        if (i.path[0]) fieldErrors[i.path[0].toString()] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await mutation.mutateAsync({
        userId,
        username: formData.username,
        password: formData.newPassword || undefined,
      });
      setSavedData({
        user: formData.username,
        pass: formData.newPassword || "Sin cambios",
      });
      setStep(2);
      setHasChanges(false);
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
        background: theme === "dark" ? "#18181b" : "#fff",
        color: theme === "dark" ? "#fff" : "#000",
      });
    }
  };

  // --- LÓGICA DE VALIDACIÓN ---
  const isPasswordValid =
    formData.newPassword.length >= 8 &&
    /[A-Z]/.test(formData.newPassword) &&
    /[0-9]/.test(formData.newPassword) &&
    /[^A-Za-z0-9]/.test(formData.newPassword);

  if (loading)
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col h-full">
      <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-3">
        <Shield size={25} className=" text-purple-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider">
          Acceso y Seguridad
        </h3>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="space-y-2.5 ">
              <div>
                <label className="text-xs font-semibold text-foreground/70 mb-1 block">
                  Usuario
                </label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50",
                    errors.username && "border-destructive",
                  )}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground/70">
                    Contraseña
                  </label>
                  {canEdit && (
                    <button
                      onClick={() => {
                        const p = generateStrongPassword();
                        setFormData((prev) => ({
                          ...prev,
                          newPassword: p,
                          confirmPassword: p,
                        }));
                        setHasChanges(true);
                        setShowPass(true);
                      }}
                      className="text-[10px] flex items-center gap-1 font-bold hover:underline text-primary"
                    >
                      <Wand2 size={10} /> <AuroraText>Generar</AuroraText>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    name="newPassword"
                    type={showPass ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={!canEdit}
                    placeholder="Nueva contraseña"
                    className={cn(
                      "flex h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm pr-8 focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50",
                      errors.newPassword && "border-destructive",
                      // AÑADIDO: Si cumple todo y tiene texto, borde VERDE
                      formData.newPassword.length > 0 &&
                        isPasswordValid &&
                        "border-green-500 ring-green-500",
                    )}
                  />
                  <button
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <input
                  name="confirmPassword"
                  type={showPass ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={!canEdit}
                  placeholder="Confirmar contraseña"
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50",
                    // Borde rojo si no coinciden
                    formData.confirmPassword &&
                      formData.newPassword !== formData.confirmPassword &&
                      "border-red-500 ring-red-500",
                    // Borde verde si coinciden
                    formData.confirmPassword &&
                      formData.newPassword === formData.confirmPassword &&
                      "border-green-500 ring-green-500",
                  )}
                />

                {/* MENSAJE DE COINCIDENCIA DE CONTRASEÑA */}
                {formData.confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {formData.newPassword === formData.confirmPassword ? (
                      <span className="text-xs font-medium text-green-600 dark:text-green-500 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Las contraseñas coinciden
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1">
                        <XCircle size={12} /> Las contraseñas no coinciden
                      </span>
                    )}
                  </div>
                )}

                {/* REQUISITOS DE CONTRASEÑA */}
                {formData.newPassword.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                    {[
                      {
                        label: "Mín. 8 caracteres",
                        met: formData.newPassword.length >= 8,
                      },
                      {
                        label: "Una mayúscula",
                        met: /[A-Z]/.test(formData.newPassword),
                      },
                      {
                        label: "Un número",
                        met: /[0-9]/.test(formData.newPassword),
                      },
                      {
                        label: "Un símbolo",
                        met: /[^A-Za-z0-9]/.test(formData.newPassword),
                      },
                    ].map((req, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-medium transition-colors",
                          req.met
                            ? "text-green-600 dark:text-green-500"
                            : "text-red-500 dark:text-red-400",
                        )}
                      >
                        {req.met ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        <span>{req.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <UserStatusToggle
              userId={userId}
              isBanned={!!credentials?.banned_until}
              onStatusChange={refetch}
              canEdit={canEdit}
            />
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={!hasChanges || mutation.isPending}
                className="w-full h-9 mt-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {mutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Guardar Cambios
              </button>
            )}
          </motion.div>
        ) : (
          <SuccessView
            savedData={savedData}
            phone={credentials?.phone || ""}
            onBack={() => setStep(1)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
// --- SUB-COMPONENT: VISTA ÉXITO ---
const SuccessView = ({
  savedData,
  phone,
  onBack,
}: {
  savedData: { user: string; pass: string };
  phone: string;
  onBack: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [inputPhone, setInputPhone] = useState(phone);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `Usuario: ${savedData.user}\nContraseña: ${savedData.pass}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="space-y-4"
    >
      <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-border/50">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
            Actualizado
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"
          >
            {copied ? <CheckCircle2 size={12} /> : <ClipboardCopy size={12} />}{" "}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs flex items-center justify-between">
            <span className="font-bold opacity-70">Usuario:</span>
            <span className="font-mono">{savedData.user}</span>
          </p>
          <p className="text-xs flex items-center justify-between">
            <span className="font-bold opacity-70">Clave:</span>
            <code className="bg-background px-1.5 py-0.5 rounded border text-[10px]">
              {savedData.pass}
            </code>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={inputPhone}
          onChange={(e) =>
            setInputPhone(e.target.value.replace(/\D/g, "").slice(0, 8))
          }
          placeholder="Teléfono (8 dígitos)"
          className="flex-1 h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() =>
            window.open(
              `https://wa.me/502${inputPhone}?text=${encodeURIComponent(
                `*CREDENCIALES ACTUALIZADAS*\n\nUsuario: ${savedData.user}\nContraseña: ${savedData.pass}\n\n_Por favor cambie su contraseña al ingresar._`,
              )}`,
              "_blank",
            )
          }
          disabled={inputPhone.length !== 8}
          className="h-9 px-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-md disabled:opacity-50 transition-colors shadow-sm"
        >
          <MessageCircle size={16} />
        </button>
      </div>

      <button
        onClick={onBack}
        className="w-full h-9 border rounded-lg text-xs font-bold uppercase hover:bg-muted flex items-center justify-center gap-2 transition-colors"
      >
        <ArrowLeft size={14} /> Volver
      </button>
    </motion.div>
  );
};