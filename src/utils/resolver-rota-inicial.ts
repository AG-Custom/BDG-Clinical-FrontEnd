import { permissoesMenu } from '@/constants/permissoes';
import type { useAuthStore } from '@/stores/auth.store';

interface RotaInicialCandidata {
  name: string;
  permissao: string;
}

const ROTAS_INICIAIS: RotaInicialCandidata[] = [
  { name: 'dashboard', permissao: permissoesMenu.agenda },
  { name: 'pacientes', permissao: permissoesMenu.pacientes },
  { name: 'unidades', permissao: permissoesMenu.unidades },
  { name: 'aplicacoes-paciente', permissao: permissoesMenu.aplicacoes },
  { name: 'procedimentos', permissao: permissoesMenu.procedimentos },
  { name: 'sintomas', permissao: permissoesMenu.sintomas },
  { name: 'funcionarios', permissao: permissoesMenu.funcionarios },
  { name: 'cargos', permissao: permissoesMenu.cargos },
  { name: 'produtos', permissao: permissoesMenu.produtos },
  { name: 'tipos-produto', permissao: permissoesMenu.tiposProduto },
  { name: 'unidades-medida', permissao: permissoesMenu.unidadesMedida },
  { name: 'saldos-estoque', permissao: permissoesMenu.estoque },
  { name: 'movimentacoes-estoque', permissao: permissoesMenu.movimentacoesEstoque },
  { name: 'fornecedores', permissao: permissoesMenu.fornecedores },
  { name: 'pedidos-fornecedor', permissao: permissoesMenu.pedidosFornecedor },
  { name: 'empresas', permissao: permissoesMenu.empresas },
];

export function resolverRotaInicial(
  authStore: ReturnType<typeof useAuthStore>,
): { name: string } {
  const rotaPermitida = ROTAS_INICIAIS.find((rota) =>
    authStore.possuiPermissao(rota.permissao),
  );

  return { name: rotaPermitida?.name ?? 'dashboard' };
}
