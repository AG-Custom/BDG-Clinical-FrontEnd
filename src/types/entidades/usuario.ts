import type { EmpresaResumo } from '@/types/entidades/empresa';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  isAdmin: boolean;
  permissoes?: string[];
  empresaAtual?: EmpresaResumo;
}
