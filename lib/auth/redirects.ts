export function applicationOrigin(requestUrl: string, configuredUrl?: string): string {
  const url = new URL(configuredUrl || requestUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Application URL must use HTTP or HTTPS");
  }
  return url.origin;
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) {
    return "/dashboard";
  }
  const url = new URL(value, "https://app.invalid");
  return url.origin === "https://app.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/dashboard";
}
