"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "../lib/permissions";
import { resolveKnownRole } from "../lib/helpers";

type SelectorRolProps = {
  value: string;
  onChange: (role: string) => void;
  roleOptions: string[];
  allowCustom?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  preferredRole?: string | null;
  resetKey?: string | number | boolean;
  id?: string;
  name?: string;
  inputClassName?: string;
  selectClassName?: string;
  toggleClassName?: string;
};

export function SelectorRol({
  value,
  onChange,
  roleOptions,
  allowCustom = false,
  disabled = false,
  readOnly = false,
  preferredRole,
  resetKey,
  id = "rol",
  name = "rol",
  inputClassName,
  selectClassName,
  toggleClassName,
}: SelectorRolProps) {
  const [isCustomRole, setIsCustomRole] = useState(false);

  const displayRoleOptions = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed || roleOptions.includes(trimmed)) return roleOptions;
    return [...roleOptions, trimmed];
  }, [roleOptions, value]);

  useEffect(() => {
    setIsCustomRole(false);
  }, [resetKey]);

  useEffect(() => {
    if (
      !isCustomRole &&
      !readOnly &&
      displayRoleOptions.length > 0 &&
      value &&
      !displayRoleOptions.includes(value)
    ) {
      onChange(resolveKnownRole(roleOptions, preferredRole));
    }
  }, [
    isCustomRole,
    readOnly,
    roleOptions,
    displayRoleOptions,
    value,
    preferredRole,
    onChange,
  ]);

  const fieldClassName =
    "flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm outline-none transition-all";

  const handleToggleCustom = () => {
    if (isCustomRole) {
      if (!value.trim()) {
        onChange(resolveKnownRole(roleOptions, preferredRole));
      }
    } else {
      onChange("");
    }
    setIsCustomRole(!isCustomRole);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        {isCustomRole ? (
          <input
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Escribe el nuevo rol..."
            className={cn(
              fieldClassName,
              "focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50",
              inputClassName,
            )}
            autoFocus
          />
        ) : (
          <select
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || readOnly}
            className={cn(
              fieldClassName,
              "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-1 focus-visible:ring-primary",
              selectClassName,
            )}
          >
            {readOnly ? (
              <option value={value}>
                {ROLE_LABELS[value] || value || "Usuario"}
              </option>
            ) : (
              displayRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] || role}
                </option>
              ))
            )}
          </select>
        )}
      </div>
      {allowCustom && !readOnly && !disabled && (
        <button
          type="button"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-background/50 hover:bg-muted/50 transition-colors cursor-pointer text-foreground",
            toggleClassName,
          )}
          title={isCustomRole ? "Seleccionar rol existente" : "Crear nuevo rol"}
          onClick={handleToggleCustom}
        >
          {isCustomRole ? <X size={16} /> : <Plus size={16} />}
        </button>
      )}
    </div>
  );
}
