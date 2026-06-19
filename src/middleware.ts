import { NextResponse, type NextRequest } from "next/server";
import { getAuth0 } from "@/lib/auth0";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const auth0 = getAuth0();
  if (auth0 === null) return NextResponse.next();
  return auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
