export function getClientIp(request: Pick<Request, "headers">): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const [firstIp = ""] = xForwardedFor.split(",");
    return firstIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "anonymous";
}
