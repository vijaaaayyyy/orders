import { createMiddleware, createStart } from "@tanstack/react-start";
import installPageTemplate from "../scripts/install-page.html?raw";
import { grokOgIdentity } from "virtual:grok-og-identity";
// @ts-ignore shared JS helpers
import {
  acceptsHtml,
  injectGrokPwaHead,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
} from "../scripts/grok-pwa-shared.mjs";

function requestHost(request: Request, url: URL): string {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host
  );
}

const grokPwaRequestMiddleware = createMiddleware().server(async ({ request, next }) => {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return next();
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const urlWithQuery = path + url.search;
  const host = requestHost(request, url);

  if (path === "/__grok/manifest.webmanifest" || path === "/__grok/manifest.json") {
    const body = renderWebManifest(host);
    return new Response(method === "HEAD" ? null : body, {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  if (
    isInstallQuery(urlWithQuery) &&
    isDocumentPath(path) &&
    acceptsHtml(request.headers.get("accept"))
  ) {
    const html = renderInstallPageHtml(installPageTemplate, {
      host,
      url: urlWithQuery,
    });
    return new Response(method === "HEAD" ? null : html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }

  const response = await next();

  if (
    !isDocumentPath(path) ||
    !(response instanceof Response) ||
    !String(response.headers.get("content-type") ?? "").includes("text/html") ||
    response.headers.get("content-encoding")
  ) {
    return response;
  }

  // Best-effort full-buffer head injection for production HTML responses.
  // (Dev/preview injection is handled by the Vite grokPwaPlugin.)
  try {
    const html = await response.text();
    const injected = injectGrokPwaHead(html, {
      host,
      site: (grokOgIdentity as any)?.site ?? {},
    });
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [grokPwaRequestMiddleware],
}));
