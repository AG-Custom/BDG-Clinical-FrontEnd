import { AUTH_TOKEN_KEY, AUTH_USUARIO_KEY } from '@/constants/auth';
import type { UsuarioAutenticado } from '@/types/entidades/usuario';
import { normalizarUsuarioAuth } from '@/utils/normalizar-usuario-auth';

export function lerTokenAuth(): string | null {
  migrarSessionParaLocalStorage();

  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function lerUsuarioAuth(): UsuarioAutenticado | null {
  migrarSessionParaLocalStorage();

  const usuarioJson = localStorage.getItem(AUTH_USUARIO_KEY);

  return usuarioJson
    ? normalizarUsuarioAuth(JSON.parse(usuarioJson) as UsuarioAutenticado)
    : null;
}

export function salvarTokenAuth(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function salvarUsuarioAuth(usuario: UsuarioAutenticado): void {
  localStorage.setItem(AUTH_USUARIO_KEY, JSON.stringify(usuario));
}

export function limparAuthStorage(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USUARIO_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USUARIO_KEY);
}

export function migrarSessionParaLocalStorage(): void {
  const tokenSession = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const usuarioSession = sessionStorage.getItem(AUTH_USUARIO_KEY);

  if (tokenSession && !localStorage.getItem(AUTH_TOKEN_KEY)) {
    localStorage.setItem(AUTH_TOKEN_KEY, tokenSession);
  }

  if (usuarioSession && !localStorage.getItem(AUTH_USUARIO_KEY)) {
    localStorage.setItem(AUTH_USUARIO_KEY, usuarioSession);
  }

  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USUARIO_KEY);
}
