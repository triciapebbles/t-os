import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  }
);

export const config = {
  // Require a signed-in (and allow-listed) session for every page and
  // API route except auth endpoints, the login page, static assets, and
  // the health-check endpoint used by the self-ping keep-alive and by
  // Render's own health checks.
  matcher: ["/((?!api/auth|api/health|login|_next/static|_next/image|favicon.ico).*)"],
};
