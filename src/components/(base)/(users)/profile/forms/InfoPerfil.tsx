"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  User,
  Phone,
  MapPin,
  Fingerprint,
  Calendar,
  Heart,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import { useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../lib/actions";
import { useProfile } from "../lib/hooks";
import { cn } from "@/lib/utils";

const Label = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    {...props}
    className={cn(
      "text-sm font-semibold leading-none text-foreground/70 mb-2 block",
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
      "flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition-all",
      className,
    )}
  />
);

const Select = ({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative w-full">
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

interface InfoPerfilProps {
  userId: string;
  canEdit: boolean;
}

export const InfoPerfil = ({ userId, canEdit }: InfoPerfilProps) => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { profile: perfilData } = useProfile(userId, true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (perfilData) {
      setFormData(perfilData);
      setHasChanges(false);
    }
  }, [perfilData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    if (!canEdit) return;
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);

    const swalConfig = {
      background: theme === "dark" ? "#18181b" : "#ffffff",
      color: theme === "dark" ? "#ffffff" : "#000000",
      toast: true,
      position: "top" as const,
      showConfirmButton: false,
      timer: 2000,
    };

    try {
      await updateProfile(userId, formData);
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setHasChanges(false);
      Swal.fire({
        ...swalConfig,
        icon: "success",
        title: "Guardado",
      });
    } catch (e: any) {
      Swal.fire({
        ...swalConfig,
        icon: "error",
        title: "Error",
        text: e.message,
        timer: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const NavButtons = (
    <div className="flex md:hidden items-center gap-2 text-muted-foreground/60">
      <button
        onClick={() => setStep((s) => Math.max(1, s - 1))}
        disabled={step === 1}
        className="active:scale-90 disabled:opacity-10 transition-all p-1"
      >
        <ChevronLeft size={32} />
      </button>
      <button
        onClick={() => setStep((s) => Math.min(3, s + 1))}
        disabled={step === 3}
        className="active:scale-90 disabled:opacity-10 transition-all p-1"
      >
        <ChevronRight size={32} />
      </button>
    </div>
  );

  const SectionPersonal = (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <User size={25} className="text-blue-700" />
          <h3 className="text-md font-bold uppercase tracking-tight">
            Personal
          </h3>
        </div>
        {NavButtons}
      </div>
      <div className="space-y-4">
        <div>
          <Label>Nombre Completo</Label>
          <Input
            name="nombre"
            value={formData.nombre || ""}
            onChange={handleChange}
            disabled={!canEdit}
          />
        </div>
        <div>
          <Label>DPI</Label>
          <div className="relative">
            <Fingerprint
              size={14}
              className="absolute left-3 top-3 text-muted-foreground"
            />
            <Input
              name="dpi"
              inputMode="numeric"
              value={formData.dpi || ""}
              onChange={handleChange}
              disabled={!canEdit}
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label>Género</Label>
          <Select
            name="genero"
            value={formData.genero || "Masculino"}
            onChange={handleChange}
            disabled={!canEdit}
          >
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </Select>
        </div>
        <div className="min-w-0">
          <Label>Fecha Nacimiento</Label>
          <div
            className="relative flex items-center group cursor-pointer"
            onClick={(e) => {
              const input = e.currentTarget.querySelector("input");
              if (input && !input.disabled) input.showPicker();
            }}
          >
            <Calendar
              size={14}
              className="absolute left-3 text-muted-foreground pointer-events-none z-10"
            />
            <Input
              type="date"
              name="fecha_nacimiento"
              value={formData.fecha_nacimiento?.split("T")[0] || ""}
              onChange={handleChange}
              disabled={!canEdit}
              className={cn(
                "pl-9 pr-3 cursor-pointer w-full appearance-none",
                "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const SectionContacto = (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <MapPin size={25} className="text-green-700" />
          <h3 className="text-md font-bold uppercase tracking-tight">
            Contacto
          </h3>
        </div>
        {NavButtons}
      </div>
      <div className="space-y-4">
        <div>
          <Label>Correo Electrónico</Label>
          <Input
            name="email"
            value={formData.email || ""}
            onChange={handleChange}
            disabled={!canEdit}
          />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input
            name="telefono"
            type="tel"
            inputMode="numeric"
            value={formData.telefono || ""}
            onChange={handleChange}
            disabled={!canEdit}
          />
        </div>
        <div>
          <Label>Dirección</Label>
          <Input
            name="direccion"
            value={formData.direccion || ""}
            onChange={handleChange}
            disabled={!canEdit}
          />
        </div>
      </div>
    </div>
  );

  const SectionEmergencia = (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Heart size={25} className="text-red-500" />
          <h3 className="text-md font-bold uppercase tracking-tight">
            Emergencia
          </h3>
        </div>
        {NavButtons}
      </div>
      <div className="space-y-4">
        <div>
          <Label>Nombre Contacto</Label>
          <Input
            name="contacto_emergencia"
            value={formData.contacto_emergencia || ""}
            onChange={handleChange}
            disabled={!canEdit}
          />
        </div>
        <div>
          <Label>Teléfono Emergencia</Label>
          <Input
            name="telefono_emergencia"
            type="tel"
            inputMode="numeric"
            value={formData.telefono_emergencia || ""}
            onChange={handleChange}
            disabled={!canEdit}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col h-full animate-in fade-in duration-300 ">
      <div className="hidden md:grid md:grid-cols-3 md:mx-20 gap-10 pb-6">
        {SectionPersonal}
        {SectionContacto}
        {SectionEmergencia}
      </div>

      <div className="md:hidden flex flex-col flex-1">
        <div className="flex-1 space-y-6">
          {step === 1 && (
            <div className="animate-in fade-in duration-300">
              {SectionPersonal}
            </div>
          )}
          {step === 2 && (
            <div className="animate-in fade-in duration-300">
              {SectionContacto}
            </div>
          )}
          {step === 3 && (
            <div className="animate-in fade-in duration-300">
              {SectionEmergencia}
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="mt-8 pt-6 border-t border-border/60 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={cn(
              "flex items-center justify-center gap-2 h-12 md:h-10 px-8 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:grayscale w-full md:w-auto",
            )}
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            GUARDAR CAMBIOS
          </button>
        </div>
      )}
    </div>
  );
};
