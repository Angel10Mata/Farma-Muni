"use server";

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";
import { isAdminRole, resolveUserRole } from "@/lib/user-role";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";

const rpID = process.env.NEXT_PUBLIC_RP_ID as string;
const rpName = "Kore Auth";
const origin = process.env.NEXT_PUBLIC_RP_ORIGIN as string;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

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

  if (userPasskeys.length >= 3) {
    throw new Error("Límite de dispositivos alcanzado (Máximo 3)");
  }

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
  deviceName: string = "Dispositivo Desconocido"
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

    const verification: VerifiedRegistrationResponse =
      await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      );

      const { error: insertError } = await supabaseAdmin
        .from("passkeys")
        .insert({
          user_id: user.id,
          credential_id: credential.id,
          public_key: Buffer.from(credential.publicKey).toString("base64url"),
          webauthn_user_id: user.id,
          counter: credential.counter,
          device_type: credentialDeviceType,
          backed_up: credentialBackedUp,
          transports: credential.transports?.join(",") || "",
          device_name: deviceName,
        });

      if (insertError)
        return { success: false, error: `DB Error: ${insertError.message}` };

      cookieStore.delete("webauthn_challenge");
      return { success: true };
    }

    return { success: false, error: "Verificación fallida" };
  } catch (err: unknown) {
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

    const { data: passkey, error: passkeyError } = await supabaseAdmin
      .from("passkeys")
      .select("*")
      .eq("credential_id", response.id)
      .single();

    if (passkeyError || !passkey)
      return { success: false, error: "Dispositivo no reconocido, inicie sesión con su usuario y luego registre su dispositivo" };

    const verification: VerifiedAuthenticationResponse =
      await verifyAuthenticationResponse({
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

    if (verification.verified && verification.authenticationInfo) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
        passkey.user_id,
      );

      if (!userData.user)
        return { success: false, error: "Usuario no encontrado" };

      const realRole = await resolveUserRole(supabaseAdmin, userData.user);

      if (!isAdminRole(realRole)) {
        const headerList = await headers();
        const userAgent = headerList.get("user-agent") || "Desconocido";

        const { data: device } = await supabaseAdmin
          .from("authorized_devices")
          .select("is_authorized")
          .eq("user_id", userData.user.id)
          .eq("browser_fingerprint", userAgent)
          .single();

        if (!device) {
          // Check device limit (max 3 per user)
          const { count } = await supabaseAdmin
            .from("authorized_devices")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userData.user.id);

          if ((count ?? 0) >= 3) {
            return { success: false, error: "DEVICE_LIMIT" };
          }

          await supabaseAdmin.from("authorized_devices").insert({
            user_id: userData.user.id,
            device_name: userAgent,
            browser_fingerprint: userAgent,
            is_authorized: false,
          });
          return { success: false, error: "DEVICE_PENDING" };
        }

        if (!device.is_authorized)
          return { success: false, error: "DEVICE_PENDING" };
      }

      await supabaseAdmin
        .from("passkeys")
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq("id", passkey.id);

      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userData.user.email!,
        });

      if (linkError || !linkData?.properties?.email_otp)
        return { success: false, error: "Error OTP" };

      const supabase = await createClient();
      const { error: sessionError } = await supabase.auth.verifyOtp({
        email: userData.user.email!,
        token: linkData.properties.email_otp,
        type: "magiclink",
      });

      if (sessionError) return { success: false, error: sessionError.message };

      cookieStore.delete("webauthn_auth_challenge");
      return { success: true };
    }

    return { success: false, error: "Verificación rechazada" };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Desconocido";
    return { success: false, error: errorMessage };
  }
}

export async function getPasskeysCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    
    const { count } = await supabase
      .from("passkeys")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);
      
    return count || 0;
  } catch {
    return 0;
  }
}

export type PasskeyDevice = {
  id: string;
  device_name: string;
  created_at: string;
};

export async function getPasskeys(): Promise<PasskeyDevice[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data } = await supabase
      .from("passkeys")
      .select("id, device_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
      
    return (data as PasskeyDevice[]) || [];
  } catch {
    return [];
  }
}

export async function removePasskey(id: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { error } = await supabase
      .from("passkeys")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
      
    return !error;
  } catch {
    return false;
  }
}
