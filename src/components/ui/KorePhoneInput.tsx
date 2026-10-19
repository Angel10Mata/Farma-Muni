"use client";

import React, { useState, useEffect } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumber, formatPhoneNumber } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { cn } from "@/lib/utils";

interface KorePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function KorePhoneInput({
  value,
  onChange,
  placeholder = "1234 5678",
  disabled = false,
  className,
  id,
}: KorePhoneInputProps) {
  const [country, setCountry] = useState<any>("GT");
  const [localValue, setLocalValue] = useState("");

  // Helper to parse E164 value to country and local number
  const parseE164 = (val: string) => {
    if (!val) return { country: "GT", local: "" };
    const clean = val.trim().replace(/\s+/g, "");
    if (!clean) return { country: "GT", local: "" };

    // Try finding a matching calling code
    for (const c of getCountries()) {
      const prefix = `+${getCountryCallingCode(c)}`;
      if (clean.startsWith(prefix)) {
        let local = clean.slice(prefix.length);
        const parsed = parsePhoneNumber(val);
        if (parsed) {
          local = formatPhoneNumber(val) || local;
        }
        return { country: c, local };
      }
    }

    return { country: "GT", local: val };
  };

  // Sync internal state when external value changes
  useEffect(() => {
    const { country: parsedCountry, local: parsedLocal } = parseE164(value);
    setCountry(parsedCountry);
    setLocalValue(parsedLocal);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    // We only keep digits, spaces, and hyphens in local input
    const cleanLocal = rawVal.replace(/[^\d\s-]/g, "");
    setLocalValue(cleanLocal);

    // Build the E164 phone number: +[calling_code][digits]
    const digitsOnly = cleanLocal.replace(/\D/g, "");
    if (digitsOnly) {
      const callingCode = getCountryCallingCode(country);
      onChange(`+${callingCode}${digitsOnly}`);
    } else {
      onChange("");
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value as any;
    setCountry(newCountry);

    const callingCode = getCountryCallingCode(newCountry);
    const digitsOnly = localValue.replace(/\D/g, "");
    if (digitsOnly) {
      onChange(`+${callingCode}${digitsOnly}`);
    } else {
      onChange("");
    }
  };

  const FlagComponent = flags[country as keyof typeof flags];

  return (
    <div
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        className
      )}
    >
      {/* Flag Container */}
      <div className="relative flex items-center gap-1.5 cursor-pointer shrink-0 min-w-[36px] justify-center h-full border-r border-zinc-200 dark:border-zinc-800 pr-2 mr-1">
        {FlagComponent && (
          <div className="w-5 h-3.5 overflow-hidden rounded-sm shrink-0 flex items-center justify-center">
            <FlagComponent title={country} />
          </div>
        )}
        <span className="text-etiqueta text-texto-tenue select-none">▼</span>
        <select
          value={country}
          onChange={handleCountryChange}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
        >
          {getCountries().map((c) => (
            <option key={c} value={c}>
              {c} (+{getCountryCallingCode(c)})
            </option>
          ))}
        </select>
      </div>

      {/* Local Number Input */}
      <input
        type="text"
        id={id}
        value={localValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/45"
      />
    </div>
  );
}
