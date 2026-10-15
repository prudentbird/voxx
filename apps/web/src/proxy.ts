import { postHogMiddleware } from "@posthog/next";
import { NextResponse } from "next/server";

export const proxy = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? postHogMiddleware({ proxy: true })
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
