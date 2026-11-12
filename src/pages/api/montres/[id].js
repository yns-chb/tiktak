import db from "../../../lib/db";
import { svgValide } from "../../../lib/montre";

export const prerender = false;

const json = (corps, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

// Une montre n'est accessible que par son propriétaire (sinon n'importe qui pourrait modifier celle d'un autre : faille IDOR)
function proprietaire(id, userId) {
  return db.prepare("SELECT id_montre FROM MONTRE WHERE id_montre = ? AND user_id = ?").get(Number(id), userId);
}

// PUT /api/montres/:id : modifie nom, svg, prix et composants
export const PUT = async ({ request, params, locals }) => {
  const user = locals.user;
  if (!user) return json({ erreur: "Non authentifié" }, 401);
  if (!proprietaire(params.id, user.id)) return json({ erreur: "Introuvable" }, 404);

  const corps = await request.json().catch(() => null);
  const nom = typeof corps?.nom === "string" ? corps.nom.trim().slice(0, 30) : "";
  const ids = Array.isArray(corps?.composants) ? corps.composants.map(Number) : [];
  if (!nom || ids.length === 0 || ids.some((id) => !Number.isInteger(id))) return json({ erreur: "Données invalides" }, 400);
  if (!svgValide(corps.svg)) return json({ erreur: "SVG refusé" }, 400);

  const marques = ids.map(() => "?").join(",");
  const composants = db.prepare(`SELECT id_composant, prix FROM COMPOSANT WHERE id_composant IN (${marques})`).all(...ids);
  if (composants.length !== new Set(ids).size) return json({ erreur: "Composant inconnu" }, 400);
  const prix = composants.reduce((somme, c) => somme + c.prix, 0);

  db.transaction(() => {
    db.prepare("UPDATE MONTRE SET nom = ?, prix = ?, svg = ? WHERE id_montre = ? AND user_id = ?").run(
      nom,
      prix,
      corps.svg,
      Number(params.id),
      user.id
    );
    db.prepare("DELETE FROM POSSEDE WHERE id_montre = ?").run(Number(params.id));
    const lier = db.prepare("INSERT INTO POSSEDE (id_montre, id_composant) VALUES (?, ?)");
    for (const c of composants) lier.run(Number(params.id), c.id_composant);
  })();

  return json({ id_montre: Number(params.id) });
};

// DELETE /api/montres/:id
export const DELETE = ({ params, locals }) => {
  const user = locals.user;
  if (!user) return json({ erreur: "Non authentifié" }, 401);
  if (!proprietaire(params.id, user.id)) return json({ erreur: "Introuvable" }, 404);

  try {
    db.prepare("DELETE FROM MONTRE WHERE id_montre = ? AND user_id = ?").run(Number(params.id), user.id);
  } catch {
    // Une montre déjà commandée est référencée par LIGNE_DE_COMMANDE : on ne la supprime pas
    return json({ erreur: "Cette montre a déjà été commandée" }, 409);
  }
  return json({ ok: true });
};
