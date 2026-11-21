************ CREAR COMPONENTES NUEVOS **********

"Necesito crear el módulo de [NOMBRE_DEL_MÓDULO]. Aplica estrictamente mi estructura modular de carpetas y las siguientes reglas:

    lib/zod.ts: Esquemas de validación con Zod e interfaces TypeScript estrictas. PROHIBIDO usar any.

    lib/actions.ts: Server Actions para interactuar con la base de datos (Supabase).

    lib/hooks.ts: Hooks personalizados utilizando TanStack Query (useQuery, useMutation) que consuman las Server Actions.

    components/: Subcomponentes de UI aislados (tablas, tarjetas, listas).

    modals/: Modales para vistas de detalle, creación o edición.

    index.tsx: Contenedor principal limpio que solo llame a los hooks y pase los datos a los subcomponentes.

Reglas obligatorias:

    Cero comentarios internos en el código.

    Tipado estricto en el 100% del código.

    Entrégame el código completo de cada archivo para copiar y pegar."


"use server";

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";

const rpID = process.env.NEXT_PUBLIC_RP_ID as string;
const rpName = "FarmaMuni Auth";
const origin = process.env.NEXT_PUBLIC_RP_ORIGIN as string;

export async function getRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("No autenticado");

  const { data: existingPasskeys } = await supabase
    .from("passkeys")
    .select("credential_id")
    .eq("user_id", user.id);

  const userPasskeys = existingPasskeys || [];

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new Uint8Array(Buffer.from(user.id)),
    userName: user.email as string,
    attestationType: "none",
    excludeCredentials: userPasskeys.map((passkey) => ({
      id: passkey.credential_id,
      transports: ["internal"],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("webauthn_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60000,
    path: "/",
  });

  return options;
}

export async function verifyRegistration(
  response: RegistrationResponseJSON,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "No autenticado" };

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get("webauthn_challenge")?.value;

    if (!expectedChallenge)
      return { success: false, error: "Challenge no encontrado" };

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      const { error: insertError } = await supabase.from("passkeys").insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString("base64url"),
        webauthn_user_id: user.id,
        counter: credential.counter,
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        transports: credential.transports?.join(",") || "",
      });

      if (insertError)
        return { success: false, error: "Error al guardar en BD" };

      cookieStore.delete("webauthn_challenge");
      return { success: true };
    }

    return { success: false, error: "Verificación fallida" };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: errorMessage };
  }
}

export async function getPasskeyOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  const cookieStore = await cookies();
  cookieStore.set("webauthn_auth_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60000,
    path: "/",
  });

  return options;
}

export async function verifyPasskey(
  response: AuthenticationResponseJSON,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get("webauthn_auth_challenge")?.value;

    if (!expectedChallenge)
      return { success: false, error: "Challenge caducado" };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

    const { data: passkey, error: passkeyError } = await supabaseAdmin
      .from("passkeys")
      .select("*")
      .eq("credential_id", response.id)
      .single();

    if (passkeyError || !passkey)
      return { success: false, error: "Dispositivo no reconocido" };

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credential_id,
          publicKey: new Uint8Array(
            Buffer.from(passkey.public_key, "base64url"),
          ),
          counter: Number(passkey.counter),
          transports: passkey.transports
            ? (passkey.transports.split(",") as AuthenticatorTransportFuture[])
            : [],
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      return { success: false, error: `Biometría falló: ${errorMessage}` };
    }

    if (verification.verified && verification.authenticationInfo) {
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(passkey.user_id);
      
      if (userError || !userData.user?.email)
        return { success: false, error: "Usuario no encontrado" };

      const metadata = userData.user.user_metadata || {};
      const realRole = metadata.rol || userData.user.role || "user";

      if (!["super", "admin"].includes(realRole)) {
        const headerList = await headers();
        const userAgent = headerList.get('user-agent') || 'Desconocido';
        
        const { data: device } = await supabaseAdmin
          .from("authorized_devices")
          .select("is_authorized")
          .eq("user_id", userData.user.id)
          .eq("browser_fingerprint", userAgent)
          .single();

        if (!device) {
          await supabaseAdmin.from("authorized_devices").insert({
            user_id: userData.user.id,
            device_name: userAgent,
            browser_fingerprint: userAgent,
            is_authorized: false
          });
          return { success: false, error: "DEVICE_PENDING" };
        }
        
        if (!device.is_authorized) return { success: false, error: "DEVICE_PENDING" };
      }

      await supabaseAdmin
        .from("passkeys")
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq("id", passkey.id);

      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userData.user.email,
        });

      if (linkError) return { success: false, error: linkError.message };

      const email_otp = linkData?.properties?.email_otp;
      if (!email_otp) return { success: false, error: "Error OTP" };

      const supabase = await createClient();
      const { error: sessionError } = await supabase.auth.verifyOtp({
        email: userData.user.email,
        token: email_otp,
        type: "magiclink",
      });

      if (sessionError) return { success: false, error: sessionError.message };

      cookieStore.delete("webauthn_auth_challenge");
      return { success: true };
    }

    return { success: false, error: "Verificación rechazada" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Desconocido";
    return { success: false, error: errorMessage };
  }
}

*CREDENCIALES DE ACCESO*


urrhh
0X4#8R&Q

uadmin
Admin/123

uventas
H9*eaJw#

ucontador
Conta/123

prueba
Prueba/123


