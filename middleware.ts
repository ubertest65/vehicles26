import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Chrome-specific: Add CORS headers for better compatibility
  const response = NextResponse.next()

  // Add headers that Chrome requires for proper functionality
  response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none")
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")

  // Chrome-specific: Ensure proper caching headers
  if (req.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
