export const TEXTOS_AGENDAMENTO = {
  comum: {
    fechar: 'Fechar',
  },
  notificacoes: {
    confirmado: 'Agendamento confirmado.',
    motivoCancelamentoObrigatorio: 'Informe o motivo do cancelamento.',
    cancelado: 'Agendamento cancelado.',
    faltaRegistrada: 'Falta registrada.',
    concluido: 'Agendamento concluído.',
  },
  decisaoAplicacao: {
    titulo: 'Realizar aplicação?',
    descricaoInicio: 'Este é um agendamento para',
    descricaoFim:
      'Deseja realizar a aplicação agora ou concluir o agendamento sem registrá-la?',
    concluirSemAplicacao: 'Concluir sem aplicação',
    irParaAplicacao: 'Ir para aplicação',
    concluidoComRedirecionamento: 'Agendamento concluído. Abrindo a aplicação.',
    concluidoSemAplicacao: 'Atendimento concluído sem registrar aplicação.',
  },
  detalhe: {
    paciente: 'Paciente',
    profissional: 'Profissional',
    unidade: 'Unidade',
    procedimento: 'Procedimento',
    procedimentos: 'Procedimentos',
    observacoes: 'Observações',
    motivoCancelamento: 'Motivo do cancelamento',
    aplicacaoRegistrada: 'Aplicação registrada no prontuário',
    aplicacoesRegistradas: (quantidade: number) =>
      `${quantidade} aplicações registradas no prontuário`,
    entidadeAuditoria: 'Agendamento',
    registrarFalta: 'Registrar falta',
    cancelar: 'Cancelar',
    editar: 'Editar',
    confirmar: 'Confirmar',
    concluirAtendimento: 'Concluir atendimento',
    cancelarTitulo: 'Cancelar agendamento',
    cancelarInstrucao: 'Informe o motivo do cancelamento.',
    motivoObrigatorio: 'Motivo *',
    voltar: 'Voltar',
    confirmarCancelamento: 'Confirmar cancelamento',
  },
} as const;

export const REDIRECIONAMENTO_APLICACAO = {
  rotaNovaAplicacao: 'aplicacoes-paciente-nova',
  parametros: {
    pacienteId: 'pacienteId',
    unidadeId: 'unidadeId',
    aplicadorId: 'aplicadorId',
    dataAplicacao: 'dataAplicacao',
  },
} as const;
