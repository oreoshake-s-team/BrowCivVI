import { NextResponse, type NextRequest } from "next/server";
import { getAuth0 } from "@/lib/auth0";
import { isPublicPath } from "@/server/publicPaths";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const auth0 = getAuth0();
  if (auth0 === null) return NextResponse.next();

  const authRes = await auth0.middleware(request);

  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return authRes;

  const session = await auth0.getSession(request);
  if (session === null) {
    const loginUrl = new URL("/auth/login", request.nextUrl.origin);
    loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return authRes;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
