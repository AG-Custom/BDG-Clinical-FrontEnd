export const permissoes = {
  unidades: {
    visualizar: 'unidade.visualizar',
    criar: 'unidade.criar',
    editar: 'unidade.editar',
    desativar: 'unidade.excluir',
  },
  pacientes: {
    visualizar: 'paciente.visualizar',
    criar: 'paciente.criar',
    editar: 'paciente.editar',
    desativar: 'paciente.excluir',
  },
  agenda: {
    visualizar: 'agenda.visualizar',
  },
  agendamento: {
    criar: 'agendamento.criar',
    editar: 'agendamento.editar',
    cancelar: 'agendamento.cancelar',
  },
  aplicacoes: {
    visualizar: 'aplicacao.visualizar',
    criar: 'aplicacao.criar',
    editar: 'aplicacao.editar',
  },
  procedimentos: {
    visualizar: 'procedimento.visualizar',
    criar: 'procedimento.criar',
    editar: 'procedimento.editar',
    desativar: 'procedimento.excluir',
  },
  sintomas: {
    visualizar: 'sintoma.visualizar',
    criar: 'sintoma.criar',
    editar: 'sintoma.editar',
    desativar: 'sintoma.excluir',
  },
  funcionarios: {
    visualizar: 'funcionario.visualizar',
    criar: 'funcionario.criar',
    editar: 'funcionario.editar',
    desativar: 'funcionario.excluir',
  },
  cargos: {
    visualizar: 'cargo.visualizar',
    criar: 'cargo.criar',
    editar: 'cargo.editar',
    desativar: 'cargo.excluir',
  },
  produtos: {
    visualizar: 'produto.visualizar',
    criar: 'produto.criar',
    editar: 'produto.editar',
    desativar: 'produto.excluir',
  },
  tiposProduto: {
    visualizar: 'tipo_produto.visualizar',
    criar: 'tipo_produto.criar',
    editar: 'tipo_produto.editar',
    desativar: 'tipo_produto.excluir',
  },
  unidadesMedida: {
    visualizar: 'unidade_medida.visualizar',
    criar: 'unidade_medida.criar',
    editar: 'unidade_medida.editar',
    desativar: 'unidade_medida.excluir',
  },
  estoque: {
    visualizar: 'estoque.visualizar',
    movimentar: 'estoque.movimentar',
  },
  fornecedores: {
    visualizar: 'fornecedor.visualizar',
    criar: 'fornecedor.criar',
    editar: 'fornecedor.editar',
    desativar: 'fornecedor.excluir',
  },
  pedidosFornecedor: {
    visualizar: 'pedido.visualizar',
    criar: 'pedido.criar',
    editar: 'pedido.editar',
    receber: 'pedido.aprovar',
  },
  empresas: {
    visualizar: 'empresa.visualizar',
    criar: 'empresa.criar',
    editar: 'empresa.editar',
  },
  financeiro: {
    visualizar: 'financeiro.visualizar',
  },
} as const;

export const permissoesMenu = {
  agenda: permissoes.agenda.visualizar,
  unidades: permissoes.unidades.visualizar,
  pacientes: permissoes.pacientes.visualizar,
  aplicacoes: permissoes.aplicacoes.visualizar,
  procedimentos: permissoes.procedimentos.visualizar,
  sintomas: permissoes.sintomas.visualizar,
  funcionarios: permissoes.funcionarios.visualizar,
  cargos: permissoes.cargos.visualizar,
  produtos: permissoes.produtos.visualizar,
  tiposProduto: permissoes.tiposProduto.visualizar,
  unidadesMedida: permissoes.unidadesMedida.visualizar,
  estoque: permissoes.estoque.visualizar,
  movimentacoesEstoque: permissoes.estoque.visualizar,
  fornecedores: permissoes.fornecedores.visualizar,
  pedidosFornecedor: permissoes.pedidosFornecedor.visualizar,
  empresas: permissoes.empresas.visualizar,
} as const;

export const permissoesMenuEmpresa = [
  permissoes.empresas.visualizar,
  permissoes.empresas.editar,
] as const;

export const modulosMenu = {
  atendimento: [
    permissoesMenu.pacientes,
    permissoesMenu.aplicacoes,
    permissoesMenu.procedimentos,
    permissoesMenu.sintomas,
  ],
  funcionarios: [permissoesMenu.funcionarios, permissoesMenu.cargos],
  produtos: [
    permissoesMenu.produtos,
    permissoesMenu.tiposProduto,
    permissoesMenu.unidadesMedida,
  ],
  estoque: [permissoesMenu.estoque, permissoesMenu.movimentacoesEstoque],
  compras: [permissoesMenu.fornecedores, permissoesMenu.pedidosFornecedor],
} as const;
