export function getAuth(): string {
  return sessionStorage.getItem('fablino_auth') || '';
}
