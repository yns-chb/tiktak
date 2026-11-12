import { defineMiddleware } from "astro:middleware";
import { auth } from "./lib/auth";

// Pages et routes accessibles sans compte : on peut découvrir et personnaliser une montre sans être connecté.
// Se connecter n'est demandé qu'au moment d'enregistrer, de commander ou de retrouver ses montres.
const PUBLIC = [
  "/",
  "/configurateur",
  "/login",
  "/mentions-legales",
  "/cgv",
  "/contact",
  "/api/auth/",
  "/api/generateColors",
];
const estPublic = (chemin: string) =>
  chemin.includes(".") || // fichiers statiques (favicon, images...)
  PUBLIC.some((p) => (p.endsWith("/") && p !== "/" ? chemin.startsWith(p) : chemin === p));

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (pathname.startsWith("/api/auth/")) return next();

  // Utilisateur connecté (ou null), disponible dans toutes les pages via Astro.locals.user
  const result = await auth.api.getSession({ headers: context.request.headers });
  context.locals.user = result?.user ?? null;

  if (context.locals.user || estPublic(pathname)) return next();

  if (pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ erreur: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  // On garde la page demandée pour y revenir après la connexion
  return context.redirect(`/login?redirect=${encodeURIComponent(pathname + context.url.search)}`);
});
