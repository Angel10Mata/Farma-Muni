"use client";

import React from "react";

export function Dashboard() {
  return (
    <div className="space-y-6 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tighter text-foreground">
          Panel de Control
        </h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido a la gestión de tu organización.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="h-32 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm" />
        <div className="h-32 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm" />
        <div className="h-32 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm" />
        <div className="h-32 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm" />
        <div className="h-32 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm" />
        <div className="h-32 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm" />
        <div className="h-32 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm shadow-sm" />
      </div>
    </div>
  );
}
