import type { UsuarioAutenticado } from '@/types/entidades/usuario';

interface UsuarioAutenticadoApi extends Omit<UsuarioAutenticado, 'permissoes'> {
  permissions?: string[];
  permissoes?: string[];
}

export function normalizarUsuarioAuth(raw: UsuarioAutenticadoApi): UsuarioAutenticado {
  const { permissions, permissoes, ...resto } = raw;

  return {
    ...resto,
    permissoes: permissions ?? permissoes ?? [],
  };
}
