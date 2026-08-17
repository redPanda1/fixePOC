import type { ReceiptSummary } from '../types/receipts';

const TOKEN_MATERIAL_STORAGE_KEY = 'fixe.auth.tokenMaterial';
const RECEIPTS_STORAGE_KEY = 'fixe.receipts.items';

export interface StoredTokenMaterial {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

function isStoredTokenMaterial(value: unknown): value is StoredTokenMaterial {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredTokenMaterial>;
  return (
    typeof candidate.idToken === 'string' &&
    candidate.idToken.length > 0 &&
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === 'string' &&
    candidate.refreshToken.length > 0
  );
}

export function readStoredTokenMaterial(): StoredTokenMaterial | null {
  const rawValue = window.sessionStorage.getItem(TOKEN_MATERIAL_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return isStoredTokenMaterial(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function storeTokenMaterial(tokenMaterial: StoredTokenMaterial): void {
  window.sessionStorage.setItem(TOKEN_MATERIAL_STORAGE_KEY, JSON.stringify(tokenMaterial));
}

export function clearStoredAuthToken(): void {
  window.sessionStorage.removeItem(TOKEN_MATERIAL_STORAGE_KEY);
}

export function readStoredReceipts(): ReceiptSummary[] | null {
  const rawValue = window.sessionStorage.getItem(RECEIPTS_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? (parsed as ReceiptSummary[]) : null;
  } catch {
    return null;
  }
}

export function storeReceipts(receipts: ReceiptSummary[]): void {
  window.sessionStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts));
}

export function clearStoredReceipts(): void {
  window.sessionStorage.removeItem(RECEIPTS_STORAGE_KEY);
}
