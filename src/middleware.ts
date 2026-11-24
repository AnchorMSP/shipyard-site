import { NextResponse } from "next/server";

/**
 * Global security headers.
 *
 * Strict-Transport-Security forces HTTPS for one year, subdomains included.
 *
 * NOTE: Next.js only loads middleware from the project root (`middleware.ts`) or
 * from `src/middleware.ts` when the `app`/`pages` directory also lives under `src/`.
 * This project keeps `app/` at the repository root, so this file has no effect on
 * responses until it is moved to `./middleware.ts` (or the same header is added to
 * `next.config.ts` via `headers()`, or to `vercel.json`).
 */
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export function middleware() {
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  // Apply to every path, including nested routes.
  matcher: "/:path*",
};
