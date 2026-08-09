export const permissoes = {
  unidades: {
    visualizar: 'unidade.visualizar',
    criar: 'unidade.criar',
    editar: 'unidade.editar',
    desativar: 'unidade.editar',
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
    confirmar: 'agendamento.confirmar',
    concluir: 'agendamento.concluir',
    registrarFalta: 'agendamento.registrar_falta',
  },
  aplicacoes: {
    visualizar: 'aplicacao.visualizar',
    criar: 'aplicacao.criar',
    editar: 'aplicacao.editar',
    cancelar: 'aplicacao.cancelar',
  },
  procedimentos: {
    visualizar: 'procedimento.visualizar',
    criar: 'procedimento.criar',
    editar: 'procedimento.editar',
    desativar: 'procedimento.editar',
  },
  pacotes: {
    visualizar: 'pacote.visualizar',
    criar: 'pacote.criar',
    editar: 'pacote.editar',
    desativar: 'pacote.editar',
  },
  comprasPaciente: {
    visualizar: 'compra_paciente.visualizar',
    criar: 'compra_paciente.criar',
    cancelar: 'compra_paciente.cancelar',
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
    desativar: 'funcionario.editar',
  },
  // Cargos usam as permissões de funcionário no backend (PositionController).
  cargos: {
    visualizar: 'funcionario.visualizar',
    criar: 'funcionario.editar',
    editar: 'funcionario.editar',
    desativar: 'funcionario.editar',
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
    ajustar: 'estoque.ajustar',
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
    cancelar: 'pedido.cancelar',
    receber: 'pedido.aprovar',
  },
  // Backend só expõe empresa.editar no catálogo.
  empresas: {
    visualizar: 'empresa.editar',
    criar: 'empresa.editar',
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
  pacotes: permissoes.pacotes.visualizar,
  comprasPaciente: permissoes.comprasPaciente.visualizar,
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
  financeiro: permissoes.financeiro.visualizar,
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
  produtos: [
    permissoesMenu.produtos,
    permissoesMenu.tiposProduto,
    permissoesMenu.unidadesMedida,
  ],
  estoque: [
    permissoesMenu.estoque,
    permissoesMenu.movimentacoesEstoque,
    permissoesMenu.fornecedores,
    permissoesMenu.pedidosFornecedor,
  ],
  vendas: [permissoesMenu.pacotes, permissoesMenu.financeiro],
  funcionarios: [permissoesMenu.funcionarios, permissoesMenu.cargos],
} as const;
