/**
 * Authentication utilities
 */

const TOKEN_KEY = 'auth_token';

/**
 * Check if user is authenticated by checking for token in localStorage
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
}

/**
 * Get the authentication token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set the authentication token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the authentication token from localStorage
 */
export function removeToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
}

