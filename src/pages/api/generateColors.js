import { OpenAI } from "openai";
import { texteLisible } from "../../lib/montre";

// Endpoint rendu à la demande : sinon il ne peut pas lire le corps d'une requête POST
export const prerender = false;

// Variables lues au démarrage du service (fichier .env du VPS), pas figées au moment du build
const INFERENCE_API_KEY = process.env.INFERENCE_API_KEY ?? import.meta.env.INFERENCE_API_KEY;
const INFERENCE_MODEL = process.env.INFERENCE_MODEL ?? import.meta.env.INFERENCE_MODEL ?? "openrouter/free";
const INFERENCE_URL = process.env.INFERENCE_URL ?? import.meta.env.INFERENCE_URL;

// Les parties de la montre que l'IA peut colorier : elle ne doit renvoyer que ces clés
const PARTIES = ["bracelet", "exterieur", "interieur", "ecran", "texte"];
const FORMES = ["rond", "carre", "coussin"];

function consigne(configuration) {
  return (
    `Tu composes une montre connectée personnalisée. ` +
    `Les parties à colorier sont : bracelet (le bracelet), exterieur (l'anneau extérieur du boîtier), ` +
    `interieur (l'anneau intérieur du boîtier), ecran (le fond de l'écran), texte (l'heure et la date affichées). ` +
    `Tu choisis aussi la forme du cadran : rond, carre ou coussin. ` +
    `Réponds UNIQUEMENT avec un objet JSON, sans aucun texte autour, contenant exactement ces clés : forme, ${PARTIES.join(", ")}. ` +
    `forme vaut "rond", "carre" ou "coussin". Chaque couleur est au format hexadécimal #rrggbb (jamais un nom de couleur). ` +
    `Voici la configuration actuelle : ${JSON.stringify(configuration)}. ` +
    `Change ce que l'utilisateur demande et garde le reste identique. ` +
    `Si l'utilisateur décrit une ambiance ou un style sans nommer de partie, change toutes les couleurs pour qu'elles s'accordent. ` +
    `Repères : sobre = tons neutres (noir, blanc, gris, beige) ; luxe = noir et or ; nuit = bleu nuit et argent. ` +
    `Exemple : demande "carrée, bracelet rouge et écran noir" → ` +
    `{"forme":"carre","bracelet":"#b3202a","exterieur":"#c5c8cd","interieur":"#e8e6e1","ecran":"#111111","texte":"#f5f1e8"}`
  );
}

export const POST = async ({ request }) => {
  // configuration : les couleurs actuellement affichées, pour que l'IA sache ce qu'il ne faut pas changer
  const { message, configuration } = await request.json().catch(() => ({}));
  if (typeof message !== "string" || !message.trim() || message.length > 300) {
    return new Response(JSON.stringify({ couleurs: {}, forme: null }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const client = new OpenAI({
    baseURL: INFERENCE_URL,
    apiKey: INFERENCE_API_KEY,
  });

  let content = "";
  try {
    const completion = await client.chat.completions.create({
      model: INFERENCE_MODEL,
      temperature: 0.3, // peu de hasard : on veut des couleurs cohérentes avec la demande
      response_format: { type: "json_object" }, // Ollama et la plupart des modèles forcent alors une réponse JSON
      messages: [
        { role: "system", content: consigne(configuration) },
        { role: "user", content: message },
      ],
    });
    content = completion.choices[0].message.content || "";
  } catch (error) {
    // Certains modèles refusent le message "system" ou le mode JSON : on réessaie avec la consigne dans le message utilisateur
    console.error("Appel IA avec message système refusé, nouvel essai :", error);
    try {
      const completion = await client.chat.completions.create({
        model: INFERENCE_MODEL,
        messages: [{ role: "user", content: `${consigne(configuration)}\n\nDemande de l'utilisateur : ${message}` }],
      });
      content = completion.choices[0].message.content || "";
    } catch (erreur2) {
      console.error("Appel IA impossible :", erreur2);
      return new Response(JSON.stringify({ couleurs: {}, forme: null }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  }
  console.log("réponse IA (couleurs) :", content);

  // On isole le premier objet JSON présent dans la réponse, au cas où le modèle ajoute du texte autour malgré la consigne
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  const couleurs = {};
  let forme = null;
  try {
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    // On ne fait jamais confiance aveuglément à une réponse d'IA : on ne garde que les clés attendues,
    // avec une valeur au format hexadécimal valide
    for (const partie of PARTIES) {
      if (typeof parsed[partie] === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed[partie])) {
        couleurs[partie] = parsed[partie];
      }
    }
    const f = typeof parsed.forme === "string" ? parsed.forme.toLowerCase().replace("carré", "carre") : "";
    if (FORMES.includes(f)) forme = f;
  } catch (error) {
    console.error("Réponse IA non parsable en JSON :", error);
  }

  // Un petit modèle oublie souvent la lisibilité : on corrige le texte s'il est illisible sur l'écran
  const ecran = couleurs.ecran ?? configuration?.ecran;
  const texte = couleurs.texte ?? configuration?.texte;
  if (/^#[0-9a-fA-F]{6}$/.test(ecran ?? "") && /^#[0-9a-fA-F]{6}$/.test(texte ?? "") && (couleurs.ecran || couleurs.texte)) {
    couleurs.texte = texteLisible(ecran, texte);
  }

  return new Response(JSON.stringify({ couleurs, forme }), {
    headers: { "Content-Type": "application/json" },
  });
};