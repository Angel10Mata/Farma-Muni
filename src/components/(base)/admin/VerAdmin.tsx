import { getPendingDevicesCount } from "@/components/(Kore)/admin/lib/actions";
import { AlertTriangle } from "lucide-react";
import { AdminCards } from "./AdminCards";
import { adminPageShellClass } from "@/lib/module-layout";
import { ModuleHeaderBackButton } from "@/components/(base)/layout/ModuleHeaderBackButton";

// Admin
export async function VerAdmin() {
  const pendingDevices = (await getPendingDevicesCount()) ?? 0;

  return (
    <div className={adminPageShellClass}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <ModuleHeaderBackButton />
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">
            Administración
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-0.5">
          Panel de control administrativo.
        </p>
      </div>

      {pendingDevices > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="shrink-0">
            <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Hay{" "}
            <span className="font-bold">{pendingDevices}</span>{" "}
            solicitud{pendingDevices !== 1 && "es"} de dispositivo
            {pendingDevices !== 1 && "s"} pendiente
            {pendingDevices !== 1 && "s"} de aprobación.
          </p>
        </div>
      )}

      <AdminCards pendingDevices={pendingDevices} />
    </div>
  );
}
