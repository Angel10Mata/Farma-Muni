import { type NextRequest, NextResponse } from "next/server";
import { isAdminRole, resolveUserRole } from "@/lib/user-role";
import { createClient } from "@/utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request);
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Supabase auth error in proxy:", error);
  }
  const pathname = request.nextUrl.pathname;

  if (!user && pathname.startsWith("/farmamuni")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

if (user) {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("require_device_authorization")
      .limit(1)
      .maybeSingle();

    const requireAuth = settings?.require_device_authorization ?? false;
    let cachedRole: string | undefined;
    const getRealRole = async () => {
      if (cachedRole === undefined) {
        cachedRole = await resolveUserRole(supabase, user);
      }
      return cachedRole;
    };

    if (pathname === "/esperando-acceso") {
      if (!requireAuth) {
        const url = request.nextUrl.clone();
        url.pathname = "/farmamuni";
        return NextResponse.redirect(url);
      }

      const realRole = await getRealRole();

      if (isAdminRole(realRole)) {
        const url = request.nextUrl.clone();
        url.pathname = "/farmamuni";
        return NextResponse.redirect(url);
      }

      const userAgent = request.headers.get("user-agent") || "Desconocido";

      const { data: device } = await supabase
        .from("authorized_devices")
        .select("is_authorized")
        .eq("user_id", user.id)
        .eq("browser_fingerprint", userAgent)
        .single();

      if (device && device.is_authorized) {
        const url = request.nextUrl.clone();
        url.pathname = "/farmamuni";
        return NextResponse.redirect(url);
      }
    }

    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/farmamuni";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/farmamuni")) {
      const realRole = await getRealRole();

      if (
        pathname.startsWith("/farmamuni/admin") &&
        !isAdminRole(realRole)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/sin-acceso";
        return NextResponse.redirect(url);
      }

      if (requireAuth && !isAdminRole(realRole)) {
        const userAgent = request.headers.get("user-agent") || "Desconocido";

        const { data: device } = await supabase
          .from("authorized_devices")
          .select("is_authorized")
          .eq("user_id", user.id)
          .eq("browser_fingerprint", userAgent)
          .single();

        if (!device || !device.is_authorized) {
          const url = request.nextUrl.clone();
          url.pathname = "/esperando-acceso";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}
// Exclusion de cobros por archivos estáticos
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv|xlsx|woff|woff2|tff|otf|js|css)$).*)",
  ],
};
