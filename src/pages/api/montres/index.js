import db from "../../../lib/db";
import { svgValide } from "../../../lib/montre";

export const prerender = false;

const json = (corps, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

// POST /api/montres : enregistre une nouvelle montre pour l'utilisateur connecté
export const POST = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ erreur: "Non authentifié" }, 401);

  const corps = await request.json().catch(() => null);
  const nom = typeof corps?.nom === "string" ? corps.nom.trim().slice(0, 30) : "";
  const ids = Array.isArray(corps?.composants) ? corps.composants.map(Number) : [];
  if (!nom || ids.length === 0 || ids.some((id) => !Number.isInteger(id))) return json({ erreur: "Données invalides" }, 400);
  if (!svgValide(corps.svg)) return json({ erreur: "SVG refusé" }, 400);

  // Le prix est recalculé côté serveur : on ne fait pas confiance à celui envoyé par le navigateur
  const marques = ids.map(() => "?").join(",");
  const composants = db.prepare(`SELECT id_composant, prix FROM COMPOSANT WHERE id_composant IN (${marques})`).all(...ids);
  if (composants.length !== new Set(ids).size) return json({ erreur: "Composant inconnu" }, 400);
  const prix = composants.reduce((somme, c) => somme + c.prix, 0);

  const enregistrer = db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO MONTRE (nom, prix, date_creation, svg, user_id) VALUES (?, ?, ?, ?, ?)")
      .run(nom, prix, new Date().toISOString().slice(0, 10), corps.svg, user.id);
    const lier = db.prepare("INSERT INTO POSSEDE (id_montre, id_composant) VALUES (?, ?)");
    for (const c of composants) lier.run(lastInsertRowid, c.id_composant);
    return Number(lastInsertRowid);
  });

  return json({ id_montre: enregistrer() }, 201);
};
