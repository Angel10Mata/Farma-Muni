import { APP_BASE_PATH } from "@/lib/app-config";

export function getModuleBackHref(pathname: string): string | null {
  if (pathname === APP_BASE_PATH || pathname === `${APP_BASE_PATH}/`) {
    return null;
  }

  if (!pathname.startsWith(`${APP_BASE_PATH}/`)) {
    return null;
  }

  const rawSegments = pathname.split("/").filter((item) => item !== "");
  if (rawSegments.length <= 1) {
    return null;
  }

  let backHref = APP_BASE_PATH;
  const moduleName = rawSegments.length > 1 ? rawSegments[1] : "";

  if (rawSegments.includes("editar")) {
    const detalleIdx = rawSegments.indexOf("ver");
    const id =
      detalleIdx >= 0 && detalleIdx + 1 < rawSegments.length
        ? rawSegments[detalleIdx + 1]
        : "";
    backHref = id
      ? `${APP_BASE_PATH}/${moduleName}/ver/${id}`
      : `${APP_BASE_PATH}/${moduleName}`;
  } else if (rawSegments.includes("ver")) {
    backHref = `${APP_BASE_PATH}/${moduleName}`;
  } else if (rawSegments.length > 1) {
    backHref = `/${rawSegments.slice(0, -1).join("/")}`;
  }

  return backHref;
}
