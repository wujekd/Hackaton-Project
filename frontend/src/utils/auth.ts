export function resolveRedirectTarget(rawTarget: string | null | undefined, fallback = "/"): string {
  if (!rawTarget || !rawTarget.startsWith("/") || rawTarget.startsWith("//")) {
    return fallback;
  }

  return rawTarget;
}
