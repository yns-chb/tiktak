// Fonctions autour du SVG d'une montre enregistrée dans la colonne MONTRE.svg

// Parties colorées du SVG : classe CSS → partie (mêmes noms que dans le configurateur)
const CLASSES: Record<string, string[]> = {
  bracelet: ["bracelet-haut", "bracelet-bas", "bracelet-centre"],
  exterieur: ["boitier-exterieur", "rond-anneau-ext-fond"],
  interieur: ["boitier-interieur", "rond-anneau-int-fond"],
  ecran: ["boitier-ecran", "rond-ecran"],
  texte: ["ecran-heure", "ecran-date", "ecran-titre"],
};

/**
 * Un SVG venu du navigateur ne doit jamais être fait confiance : il est réaffiché avec set:html,
 * donc un <script> ou un onclick=... serait exécuté chez tous ceux qui voient la montre.
 */
export function svgValide(svg: unknown): svg is string {
  if (typeof svg !== "string" || svg.length > 200_000) return false;
  if (!/^\s*<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) return false;
  if (/<\s*(script|foreignObject|iframe|object|embed|link|style\s+[^>]*src)/i.test(svg)) return false;
  if (/\son[a-z]+\s*=/i.test(svg)) return false; // onclick=, onload=...
  if (/javascript:/i.test(svg)) return false;
  if (/<!ENTITY|<!DOCTYPE/i.test(svg)) return false;
  return true;
}

/** "rond" | "carre" | "coussin", lu dans l'attribut data-forme du SVG */
export function formeDuSvg(svg: string | null): "rond" | "carre" | "coussin" {
  const forme = svg?.match(/data-forme="(rond|carre|coussin)"/)?.[1];
  return (forme as "rond" | "carre" | "coussin") ?? "rond";
}

/** Retrouve la couleur de chaque partie dans le SVG enregistré (pour rouvrir la montre dans le configurateur) */
export function couleursDuSvg(svg: string | null): Partial<Record<keyof typeof CLASSES, string>> {
  const couleurs: Partial<Record<keyof typeof CLASSES, string>> = {};
  if (!svg) return couleurs;
  const balises = svg.match(/<[^>]+>/g) ?? [];
  for (const [partie, classes] of Object.entries(CLASSES)) {
    for (const balise of balises) {
      const classe = balise.match(/\bclass="([^"]*)"/)?.[1]?.split(/\s+/) ?? [];
      if (!classes.some((c) => classe.includes(c))) continue;
      const fill = balise.match(/\bfill="(#[0-9a-fA-F]{6})"/)?.[1];
      if (fill) {
        couleurs[partie] = fill;
        break;
      }
    }
  }
  return couleurs;
}

// ---------- Lisibilité du texte sur l'écran ----------
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
export function contraste(a: string, b: string): number {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (fonce + 0.05);
}

/** Garde la couleur de texte proposée si elle est lisible sur l'écran, sinon choisit du clair ou du foncé */
export function texteLisible(ecran: string, texte: string): string {
  if (contraste(ecran, texte) >= 4.5) return texte;
  const clair = "#f5f1e8";
  const fonce = "#2b2320";
  return contraste(ecran, clair) >= contraste(ecran, fonce) ? clair : fonce;
}