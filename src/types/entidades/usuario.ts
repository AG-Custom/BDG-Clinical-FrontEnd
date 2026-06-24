import type { EmpresaResumo } from '@/types/entidades/empresa';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  permissoes: string[];
  empresaAtual?: EmpresaResumo;
}
