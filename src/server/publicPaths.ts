export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return pathname === "/auth" || pathname.startsWith("/auth/");
}
