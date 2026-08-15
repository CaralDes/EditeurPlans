// Identifiants uniques pour les entités du projet. Un simple Date.now() peut entrer en
// collision entre deux actions déclenchées dans la même milliseconde (deux clics rapides,
// et systématiquement dans les tests qui pilotent le store en synchrone) : crypto.randomUUID()
// est disponible nativement dans tous les navigateurs ciblés et sous Node ≥ 19 (Vitest).
export function idUnique(prefixe: string): string {
  return `${prefixe}-${crypto.randomUUID()}`
}
