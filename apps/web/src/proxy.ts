import { postHogMiddleware } from "@posthog/next";

export const proxy = postHogMiddleware({ proxy: true });

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
