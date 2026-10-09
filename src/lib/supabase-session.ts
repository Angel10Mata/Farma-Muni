export function isStaleRefreshTokenMessage(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("refresh token not found") ||
    lower.includes("invalid refresh token")
  );
}

export function isStaleRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("message" in error && typeof error.message === "string") {
    return isStaleRefreshTokenMessage(error.message);
  }
  return false;
}
