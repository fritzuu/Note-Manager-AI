import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected routes that require authentication
const protectedRoutes = [
  "/assessment",
  "/dashboard",
  "/notes",
  "/assistant",
  "/insight",
  "/analytics",
  "/settings",
  "/tasks",
  "/pomodoro",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We use a cookie "__session" or "auth-token" that client sets on login
  const authCookie =
    request.cookies.get("__session")?.value ||
    request.cookies.get("auth-token")?.value;

  const isAuthenticated = !!authCookie;

  // Redirect unauthenticated users away from protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
