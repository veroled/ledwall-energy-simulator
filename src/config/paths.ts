/**
 * Prefisso di pubblicazione: vuoto in sviluppo (http://localhost:3000),
 * "/simulatore-consumi" quando l'app viene esportata dentro veroledsrl.com.
 * Tutti i riferimenti a file in /public devono passare da asset().
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const asset = (path: string) => `${BASE_PATH}${path}`;
