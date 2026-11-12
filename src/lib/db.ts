// @ts-expect-error bun:sqlite est fourni par le runtime Bun
import { Database } from "bun:sqlite";
import { fileURLToPath } from "node:url";

// Même fichier que src/lib/auth.ts : la table "user" de Better Auth est dans la même base.
const db = new Database(process.env.DB_PATH ?? fileURLToPath(new URL("../../data/db.sqlite", import.meta.url)), { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;"); // sans ça, SQLite ignore les clés étrangères (et ON DELETE CASCADE)

// ---------- Types : mêmes noms que les colonnes (donc que les props des composants) ----------
export interface Montre {
  id_montre: number;
  nom: string;
  prix: number;
  date_creation: string;
  svg: string | null;
  user_id: string;
}
export interface Composant {
  id_composant: number;
  libelle: string;
  materiau: string;
  couleur: string;
  prix: number;
  finition: string | null;
  description: string | null;
}
export interface Commande {
  id_commande: number;
  date_commande: string;
  num_voie: string;
  nom_rue: string;
  code_postal: string;
  ville: string;
  user_id: string;
}
export interface LigneCommande {
  id_montre: number;
  id_commande: number;
  quantite: number;
}

// ---------- Tables (la table "user" est créée par Better Auth) ----------
db.run(`CREATE TABLE IF NOT EXISTS MONTRE (
  'id_montre' INTEGER,
  'nom' varchar(30),
  'prix' decimal(8,2),
  'date_creation' date,
  'svg' text,
  'user_id' TEXT NOT NULL,
  PRIMARY KEY ('id_montre'),
  FOREIGN KEY ('user_id') REFERENCES "user"('id')
)`);
db.run(`CREATE TABLE IF NOT EXISTS COMPOSANT (
  'id_composant' INTEGER,
  'libelle' varchar(30),
  'materiau' varchar(30),
  'couleur' varchar(30),
  'prix' decimal(8,2),
  'finition' varchar(30),
  'description' varchar(200),
  PRIMARY KEY ('id_composant')
)`);
db.run(`CREATE TABLE IF NOT EXISTS COMMANDE (
  'id_commande' INTEGER,
  'date_commande' date,
  'num_voie' varchar(10),
  'nom_rue' varchar(50),
  'code_postal' varchar(5),
  'ville' varchar(50),
  'user_id' TEXT NOT NULL,
  PRIMARY KEY ('id_commande'),
  FOREIGN KEY ('user_id') REFERENCES "user"('id')
)`);
db.run(`CREATE TABLE IF NOT EXISTS POSSEDE (
  'id_montre' INTEGER,
  'id_composant' INTEGER,
  PRIMARY KEY ('id_montre', 'id_composant'),
  FOREIGN KEY ('id_montre') REFERENCES MONTRE('id_montre') ON DELETE CASCADE,
  FOREIGN KEY ('id_composant') REFERENCES COMPOSANT('id_composant')
)`);
db.run(`CREATE TABLE IF NOT EXISTS LIGNE_DE_COMMANDE (
  'id_montre' INTEGER,
  'id_commande' INTEGER,
  'quantite' int,
  PRIMARY KEY ('id_montre', 'id_commande'),
  FOREIGN KEY ('id_montre') REFERENCES MONTRE('id_montre'),
  FOREIGN KEY ('id_commande') REFERENCES COMMANDE('id_commande')
)`);

// ---------- Catalogue de composants : inséré une seule fois, base vide (ex. premier démarrage sur le VPS) ----------
const { n } = db.query("SELECT COUNT(*) AS n FROM COMPOSANT").get() as { n: number };
if (n === 0) {
  const insert = db.prepare(
    "INSERT INTO COMPOSANT (id_composant, libelle, materiau, couleur, prix, finition, description) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const catalogue: [number, string, string, string, number, string | null, string][] = [
    [1, "bracelet", "cuir", "noir", 45, null, "Cuir noir : sobre et élégant, il s'accorde avec toutes les tenues."],
    [2, "bracelet", "cuir", "camel", 45, null, "Cuir camel tanné en France : une teinte chaude qui se patine et raconte votre histoire."],
    [3, "bracelet", "acier", "argent", 89, null, "Acier argenté : des maillons ajustables pour une allure plus affirmée."],
    [4, "bracelet", "silicone", "blanc", 19, null, "Silicone blanc : léger et résistant, pensé pour le quotidien actif."],
    [5, "cadran rond", "verre saphir", "noir", 120, null, "Le rond, intemporel : la silhouette classique de l'horlogerie, sobre et équilibrée."],
    [6, "cadran carré", "verre minéral", "blanc", 60, null, "Le carré, graphique : des lignes franches pour une allure affirmée et contemporaine."],
    [7, "cadran coussin", "verre saphir", "bleu nuit", 90, null, "Le coussin, entre rond et carré : des angles adoucis, pour une allure singulière."],
    [8, "boîtier extérieur", "acier", "argent", 75, "Argent brossé", "Acier brossé : une finition mate et sobre, qui résiste aux rayures du quotidien."],
    [9, "boîtier extérieur", "titane", "gris", 140, "Gris anthracite", "Titane anthracite : léger et robuste, on l'oublie au poignet du matin au soir."],
    [10, "boîtier intérieur", "acier", "argent", 35, "Argent poli", "Acier poli : un reflet discret qui souligne l'écran sans le concurrencer."],
    [11, "boîtier intérieur", "laiton", "or", 55, "Or", "Laiton doré : une touche chaude qui encadre l'écran avec élégance."],
  ];
  for (const ligne of catalogue) insert.run(...ligne);
}

export default db;
