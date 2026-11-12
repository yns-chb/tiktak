import db from "./db";

// ---------- Panier ----------
// Le panier est gardé dans un cookie : { "id_montre": quantité }. La base ne contient que les commandes validées.

/** Lit le cookie sans lui faire confiance : seuls les identifiants entiers et les quantités de 1 à 9 sont gardés */
export function lirePanier(valeur: string | undefined): Record<number, number> {
  const panier: Record<number, number> = {};
  try {
    const brut = JSON.parse(valeur ?? "{}");
    for (const [id, quantite] of Object.entries(brut ?? {})) {
      const n = Number(id);
      const q = Math.floor(Number(quantite));
      if (Number.isInteger(n) && n > 0 && q >= 1) panier[n] = Math.min(q, 9);
    }
  } catch {}
  return panier;
}

// ---------- Adresse de livraison ----------
export interface Adresse {
  num_voie: string;
  nom_rue: string;
  code_postal: string;
  ville: string;
}

/** Vérifie les 4 champs du formulaire (longueurs de la table COMMANDE) ; renvoie null si l'adresse est invalide */
export function lireAdresse(form: FormData): Adresse | null {
  const champ = (nom: string) => String(form.get(nom) ?? "").trim();
  const adresse = {
    num_voie: champ("num_voie"),
    nom_rue: champ("nom_rue"),
    code_postal: champ("code_postal"),
    ville: champ("ville"),
  };
  if (!adresse.num_voie || adresse.num_voie.length > 10) return null;
  if (!adresse.nom_rue || adresse.nom_rue.length > 50) return null;
  if (!/^\d{5}$/.test(adresse.code_postal)) return null;
  if (!adresse.ville || adresse.ville.length > 50) return null;
  return adresse;
}

// ---------- Lecture des montres du panier ----------
export interface LignePanier {
  id_montre: number;
  nom: string;
  prix: number;
  svg: string | null;
  quantite: number;
}

/** Les montres du panier qui appartiennent bien à cet utilisateur (les autres sont ignorées) */
export function lignesDuPanier(userId: string, panier: Record<number, number>): LignePanier[] {
  const ids = Object.keys(panier).map(Number);
  if (ids.length === 0) return [];
  const marques = ids.map(() => "?").join(",");
  const montres = db
    .prepare(`SELECT id_montre, nom, prix, svg FROM MONTRE WHERE user_id = ? AND id_montre IN (${marques})`)
    .all(userId, ...ids) as Omit<LignePanier, "quantite">[];
  return montres.map((m) => ({ ...m, quantite: panier[m.id_montre] }));
}

export function totalDe(lignes: { prix: number; quantite: number }[]): number {
  return lignes.reduce((somme, l) => somme + l.prix * l.quantite, 0);
}

// ---------- Validation de la commande ----------
/** Crée la commande et ses lignes en une seule transaction ; renvoie id_commande, ou null si le panier est vide */
export function passerCommande(userId: string, adresse: Adresse, panier: Record<number, number>): number | null {
  const lignes = lignesDuPanier(userId, panier);
  if (lignes.length === 0) return null;

  return db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO COMMANDE (date_commande, num_voie, nom_rue, code_postal, ville, user_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(new Date().toISOString().slice(0, 10), adresse.num_voie, adresse.nom_rue, adresse.code_postal, adresse.ville, userId);
    const ajouter = db.prepare("INSERT INTO LIGNE_DE_COMMANDE (id_montre, id_commande, quantite) VALUES (?, ?, ?)");
    for (const l of lignes) ajouter.run(l.id_montre, lastInsertRowid, l.quantite);
    return Number(lastInsertRowid);
  })();
}
