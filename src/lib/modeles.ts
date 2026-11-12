// Les trois modèles de départ de la page d'accueil. Les identifiants sont ceux de la table COMPOSANT ;
// le prix « dès … € » est calculé depuis la base, il n'est pas écrit ici.
export interface Modele {
  slug: string;
  nom: string;
  description: string;
  forme: "rond" | "carre" | "coussin";
  composants: number[]; // id_composant : cadran, boîtier extérieur, boîtier intérieur, bracelet
  ecran: string; // teinte d'écran (Noir, Ivoire, Bleu nuit)
  // Couleurs de l'illustration sur la page d'accueil
  apercu: { bracelet: string; exterieur: string; interieur: string; ecran: string; texte: string };
}

export const MODELES: Modele[] = [
  {
    slug: "nuit-parisienne",
    nom: "Nuit parisienne",
    description: "Écran noir, acier brossé et cuir noir. La sobriété au quotidien.",
    forme: "rond",
    composants: [5, 8, 10, 1],
    ecran: "Noir",
    apercu: { bracelet: "#1f1f1f", exterieur: "#c5c8cd", interieur: "#c5c8cd", ecran: "#1f1f1f", texte: "#f5f1e8" },
  },
  {
    slug: "minimal-blanc",
    nom: "Minimal blanc",
    description: "Cadran carré ivoire et silicone blanc. Légère et lumineuse.",
    forme: "carre",
    composants: [6, 8, 10, 4],
    ecran: "Ivoire",
    apercu: { bracelet: "#e9e6e0", exterieur: "#c5c8cd", interieur: "#c5c8cd", ecran: "#f2efe8", texte: "#2b2320" },
  },
  {
    slug: "titane-brut",
    nom: "Titane brut",
    description: "Boîtier coussin en titane anthracite, touche de laiton et bracelet acier.",
    forme: "coussin",
    composants: [7, 9, 11, 3],
    ecran: "Bleu nuit",
    apercu: { bracelet: "#c5c8cd", exterieur: "#5f6369", interieur: "#c4a462", ecran: "#1e3350", texte: "#f5f1e8" },
  },
];
