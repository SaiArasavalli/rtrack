/**
 * Authentication utilities
 */

const TOKEN_KEY = 'auth_token';

/**
 * Decode JWT token to get payload (without verification)
 */
function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true; // If no expiration, consider it expired
    }
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    return currentTime >= expirationTime;
  } catch {
    return true; // If decoding fails, consider it expired
  }
}

/**
 * Check if user is authenticated by checking for token in localStorage and if it's not expired
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return false;
  }
  // Check if token is expired
  if (isTokenExpired(token)) {
    // Remove expired token
    removeToken();
    return false;
  }
  return true;
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

