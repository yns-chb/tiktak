// Petites fonctions d'affichage partagées par les composants

/** 275 -> "275 €" ; 19.5 -> "19,50 €" */
export function prixEuro(prix: number): string {
  return Number(prix).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** "2026-10-02" -> "2 octobre 2026" */
export function dateFr(date: string | Date): string {
  const d = new Date(date);
  return isNaN(d.getTime())
    ? String(date)
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
