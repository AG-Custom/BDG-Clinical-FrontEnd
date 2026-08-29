export type SexoPaciente = 'Feminino' | 'Masculino';

export type StatusAtendimentoClinico = 'EmAndamento' | 'Finalizado';

export type TipoAnotacaoClinica = 'Evolucao' | 'Intercorrencia' | 'Retorno' | 'Observacao';

export type TipoAnexoClinico = 'Exame' | 'Documento';

export type TipoCampoAnamnese =
  | 'TextoCurto'
  | 'TextoLongo'
  | 'Numero'
  | 'Data'
  | 'SelecaoUnica'
  | 'SelecaoMultipla'
  | 'Checkbox'
  | 'Escala'
  | 'Upload';

export interface MedicalRecord {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteSexo: SexoPaciente | null;
  pacienteDataNascimento: string | null;
  pacienteIdade: number | null;
  alergias: string | null;
  alertas: string | null;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface ClinicalEvent {
  id: string;
  atendimentoClinicoId: string | null;
  tipo: string;
  titulo: string;
  resumo: string | null;
  entidade: string;
  registroId: string;
  dadosAnteriores: string | null;
  dadosNovos: string | null;
  funcionarioId: string;
  funcionarioNome: string;
  unidadeId: string;
  unidadeNome: string;
  data: string;
}

export interface ClinicalEncounter {
  id: string;
  prontuarioId: string;
  pacienteId: string;
  pacienteNome: string;
  unidadeId: string;
  unidadeNome: string;
  funcionarioId: string;
  funcionarioNome: string;
  dataInicio: string;
  dataFim: string | null;
  status: StatusAtendimentoClinico;
  observacao: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string | null;
  timeline?: ClinicalEvent[] | null;
}

export interface ClinicalNote {
  id: string;
  atendimentoClinicoId: string;
  tipo: TipoAnotacaoClinica;
  texto: string;
  data: string;
  funcionarioId: string;
  funcionarioNome: string;
  unidadeId: string;
  unidadeNome: string;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface AnamneseField {
  id: string;
  tipo: TipoCampoAnamnese;
  label: string;
  obrigatorio: boolean;
  opcoes?: string[] | null;
  min?: number | null;
  max?: number | null;
}

export interface AnamneseTemplate {
  id: string;
  nome: string;
  especialidade: string | null;
  campos: AnamneseField[];
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface AnamneseVersion {
  id: string;
  versao: number;
  funcionarioId: string;
  funcionarioNome: string;
  respostasJson: string;
  resumoAlteracao: string | null;
  criadoEm: string;
}

export interface AnamneseRecord {
  id: string;
  atendimentoClinicoId: string;
  modeloAnamneseId: string;
  modeloNome: string;
  schemaSnapshotJson: string;
  respostasJson: string;
  versaoAtual: number;
  funcionarioId: string;
  funcionarioNome: string;
  criadoEm: string;
  atualizadoEm: string | null;
  versoes: AnamneseVersion[];
}

export interface Bioimpedancia {
  percentualMassaGorda?: number | null;
  massaGordaKg?: number | null;
  gorduraVisceral?: number | null;
  percentualMassaMagra?: number | null;
  massaMagraKg?: number | null;
  pesoMuscularKg?: number | null;
  pesoOsseoKg?: number | null;
  percentualAgua?: number | null;
  aguaTotalKg?: number | null;
  pesoResidualKg?: number | null;
  idadeMetabolica?: number | null;
}

export interface Circunferencias {
  bracoDireitoRelaxado?: number | null;
  bracoDireitoContraido?: number | null;
  antebracoDireito?: number | null;
  punhoDireito?: number | null;
  bracoEsquerdoRelaxado?: number | null;
  bracoEsquerdoContraido?: number | null;
  antebracoEsquerdo?: number | null;
  punhoEsquerdo?: number | null;
  pescoco?: number | null;
  ombro?: number | null;
  torax?: number | null;
  abdomen?: number | null;
  cintura?: number | null;
  quadril?: number | null;
  coxaDireita?: number | null;
  coxaProximalDireita?: number | null;
  panturrilhaDireita?: number | null;
  coxaEsquerda?: number | null;
  coxaProximalEsquerda?: number | null;
  panturrilhaEsquerda?: number | null;
}

export interface Pregas {
  axilarMedia?: number | null;
  triceps?: number | null;
  subescapular?: number | null;
  supraIliaca?: number | null;
  torax?: number | null;
  abdominal?: number | null;
  coxa?: number | null;
}

export interface BodyAssessment {
  id: string;
  atendimentoClinicoId: string;
  pacienteId: string;
  unidadeId: string;
  unidadeNome: string;
  funcionarioId: string;
  funcionarioNome: string;
  dataAvaliacao: string;
  alturaCm: number | null;
  pesoKg: number | null;
  imc: number | null;
  classificacaoImc: string | null;
  pesoIdealKg: number | null;
  cinturaCm: number | null;
  quadrilCm: number | null;
  relacaoCinturaQuadril: number | null;
  percentualMassaGorda: number | null;
  massaGordaKg: number | null;
  percentualMassaMagra: number | null;
  massaMagraKg: number | null;
  percentualAgua: number | null;
  protocoloPrega: string | null;
  bioimpedancia: Bioimpedancia | null;
  circunferencias: Circunferencias | null;
  pregas: Pregas | null;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface BodyEvolutionPoint {
  data: string;
  pesoKg: number | null;
  imc: number | null;
  percentualMassaGorda: number | null;
  massaGordaKg: number | null;
  percentualMassaMagra: number | null;
  massaMagraKg: number | null;
  percentualAgua: number | null;
  cinturaCm: number | null;
  quadrilCm: number | null;
}

export interface ClinicalAttachment {
  id: string;
  atendimentoClinicoId: string;
  tipo: TipoAnexoClinico;
  nome: string;
  dataDocumento: string;
  observacao: string | null;
  categoriaExame: string | null;
  categoriaDocumento: string | null;
  nomeArquivo: string;
  contentType: string;
  url: string;
  tamanhoBytes: number;
  funcionarioId: string;
  funcionarioNome: string;
  criadoEm: string;
}

export interface ComparativePhoto {
  id: string;
  atendimentoClinicoId: string;
  avaliacaoCorporalId: string | null;
  categoria: string;
  dataCaptura: string;
  observacao: string | null;
  nomeArquivo: string;
  contentType: string;
  url: string;
  tamanhoBytes: number;
  funcionarioId: string;
  funcionarioNome: string;
  unidadeId: string;
  unidadeNome: string;
  criadoEm: string;
}

export interface PhotoComparison {
  esquerda: ComparativePhoto;
  direita: ComparativePhoto;
}

export interface AtividadeFisica {
  nome: string;
  mets: number;
  minutos: number;
}

export interface EnergyCalculation {
  id: string;
  atendimentoClinicoId: string;
  perfil: string;
  protocolo: string;
  nivelAtividade: string;
  fatorInjuria: number | null;
  pesoKg: number;
  alturaCm: number;
  idade: number;
  massaMagraKg: number | null;
  pesoDesejadoKg: number;
  tempoDias: number;
  atividades: AtividadeFisica[];
  gastoEnergeticoBasal: number;
  gastoEnergeticoTotal: number;
  ajusteCaloricoDiario: number;
  metaCaloricaDiaria: number;
  criadoEm: string;
}

export interface PocketRule {
  id: string;
  atendimentoClinicoId: string;
  objetivo: string;
  pesoKg: number;
  gastoEnergeticoTotal: number;
  calorias: number;
  proteinasG: number;
  carboidratosG: number;
  gordurasG: number;
  criadoEm: string;
}

export interface MedicalRecordSummary {
  prontuario: MedicalRecord;
  ultimaAvaliacao: BodyAssessment | null;
  proximoAgendamento: {
    id: string;
    dataInicio: string;
    tipo: string;
    status: string;
    funcionarioNome: string | null;
    unidadeNome: string | null;
  } | null;
  pacotesAtivos: { id: string; pacoteNome: string; dataCompra: string }[];
  ultimasAplicacoes: {
    id: string;
    dataAplicacao: string;
    procedimentoNome: string | null;
    produtoNome: string | null;
  }[];
  timeline: ClinicalEvent[];
}

export const TIPOS_ANOTACAO: { label: string; value: TipoAnotacaoClinica }[] = [
  { label: 'Evolução', value: 'Evolucao' },
  { label: 'Intercorrência', value: 'Intercorrencia' },
  { label: 'Retorno', value: 'Retorno' },
  { label: 'Observação', value: 'Observacao' },
];

export const TIPOS_CAMPO_ANAMNESE: { label: string; value: TipoCampoAnamnese }[] = [
  { label: 'Texto curto', value: 'TextoCurto' },
  { label: 'Texto longo', value: 'TextoLongo' },
  { label: 'Número', value: 'Numero' },
  { label: 'Data', value: 'Data' },
  { label: 'Seleção única', value: 'SelecaoUnica' },
  { label: 'Seleção múltipla', value: 'SelecaoMultipla' },
  { label: 'Checkbox', value: 'Checkbox' },
  { label: 'Escala', value: 'Escala' },
];

export const CATEGORIAS_EXAME = ['Laboratorial', 'Imagem', 'Bioimpedancia', 'Outros'];

export const CATEGORIAS_DOCUMENTO: { label: string; value: string }[] = [
  { label: 'Consentimento LGPD', value: 'ConsentimentoLgpd' },
  { label: 'Consentimento de procedimento', value: 'ConsentimentoProcedimento' },
  { label: 'Receita', value: 'Receita' },
  { label: 'Solicitação de exame', value: 'SolicitacaoExame' },
  { label: 'Diversos', value: 'Diversos' },
];

export const CATEGORIAS_FOTO: { label: string; value: string }[] = [
  { label: 'Frente', value: 'Frente' },
  { label: 'Costas', value: 'Costas' },
  { label: 'Lado direito', value: 'LadoDireito' },
  { label: 'Lado esquerdo', value: 'LadoEsquerdo' },
  { label: 'Superior', value: 'Superior' },
  { label: 'Inferior', value: 'Inferior' },
  { label: 'Personalizada', value: 'Personalizada' },
];

export const OPCOES_PERFIL_VENTA = [
  { label: 'Adulto', value: 'Adulto' },
  { label: 'Atleta', value: 'Atleta' },
];

export const OPCOES_PROTOCOLO_VENTA = [
  { label: 'Harris-Benedict', value: 'HarrisBenedict' },
  { label: 'Mifflin-St Jeor', value: 'MifflinStJeor' },
  { label: 'Katch-McArdle', value: 'KatchMcArdle' },
  { label: 'Cunningham', value: 'Cunningham' },
];

export const OPCOES_NIVEL_ATIVIDADE = [
  { label: 'Sedentário', value: 'Sedentario' },
  { label: 'Leve', value: 'Leve' },
  { label: 'Moderado', value: 'Moderado' },
  { label: 'Intenso', value: 'Intenso' },
  { label: 'Muito intenso', value: 'MuitoIntenso' },
];

export const OPCOES_OBJETIVO_BOLSO = [
  { label: 'Emagrecimento', value: 'Emagrecimento' },
  { label: 'Hipertrofia', value: 'Hipertrofia' },
  { label: 'Manutenção', value: 'Manutencao' },
];

export function rotuloStatusAtendimento(status: StatusAtendimentoClinico): string {
  return status === 'Finalizado' ? 'Finalizado' : 'Em andamento';
}
