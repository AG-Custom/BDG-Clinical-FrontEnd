import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  AnamneseRecord,
  AnamneseTemplate,
  BodyAssessment,
  BodyEvolutionPoint,
  ClinicalAttachment,
  ClinicalEncounter,
  ClinicalNote,
  ComparativePhoto,
  EnergyCalculation,
  MedicalRecord,
  MedicalRecordSummary,
  PhotoComparison,
  PocketRule,
  TipoAnexoClinico,
} from '@/types/entidades/prontuario';

export const prontuarioService = {
  async obterPasta(pacienteId: string): Promise<MedicalRecord> {
    const { data } = await api.get<ApiResponse<MedicalRecord>>(
      `/api/patients/${pacienteId}/medical-record`,
    );
    return data.data;
  },

  async atualizarPasta(
    pacienteId: string,
    payload: { alergias?: string | null; alertas?: string | null; observacao?: string | null },
  ): Promise<MedicalRecord> {
    const { data } = await api.patch<ApiResponse<MedicalRecord>>(
      `/api/patients/${pacienteId}/medical-record`,
      payload,
    );
    return data.data;
  },

  async obterResumo(pacienteId: string): Promise<MedicalRecordSummary> {
    const { data } = await api.get<ApiResponse<MedicalRecordSummary>>(
      `/api/patients/${pacienteId}/medical-record/summary`,
    );
    return data.data;
  },

  async listarAtendimentos(pacienteId: string): Promise<ClinicalEncounter[]> {
    const { data } = await api.get<ApiResponse<ClinicalEncounter[]>>(
      `/api/patients/${pacienteId}/clinical-encounters`,
    );
    return data.data;
  },

  async criarAtendimento(
    pacienteId: string,
    payload: { unidadeId: string; funcionarioId: string; dataInicio?: string; observacao?: string },
  ): Promise<ClinicalEncounter> {
    const { data } = await api.post<ApiResponse<ClinicalEncounter>>(
      `/api/patients/${pacienteId}/clinical-encounters`,
      payload,
    );
    return data.data;
  },

  async obterAtendimento(id: string): Promise<ClinicalEncounter> {
    const { data } = await api.get<ApiResponse<ClinicalEncounter>>(`/api/clinical-encounters/${id}`);
    return data.data;
  },

  async atualizarAtendimento(
    id: string,
    payload: { unidadeId: string; funcionarioId: string; dataInicio: string; observacao?: string },
  ): Promise<ClinicalEncounter> {
    const { data } = await api.patch<ApiResponse<ClinicalEncounter>>(
      `/api/clinical-encounters/${id}`,
      payload,
    );
    return data.data;
  },

  async finalizarAtendimento(id: string): Promise<ClinicalEncounter> {
    const { data } = await api.post<ApiResponse<ClinicalEncounter>>(
      `/api/clinical-encounters/${id}/finalize`,
    );
    return data.data;
  },

  async listarAnotacoes(atendimentoId: string): Promise<ClinicalNote[]> {
    const { data } = await api.get<ApiResponse<ClinicalNote[]>>(
      `/api/clinical-encounters/${atendimentoId}/notes`,
    );
    return data.data;
  },

  async criarAnotacao(
    atendimentoId: string,
    payload: { tipo: string; texto: string; data?: string },
  ): Promise<ClinicalNote> {
    const { data } = await api.post<ApiResponse<ClinicalNote>>(
      `/api/clinical-encounters/${atendimentoId}/notes`,
      payload,
    );
    return data.data;
  },

  async listarModelosAnamnese(includeInactive = false): Promise<AnamneseTemplate[]> {
    const { data } = await api.get<ApiResponse<AnamneseTemplate[]>>('/api/anamnese-templates', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });
    return data.data;
  },

  async obterModeloAnamnese(id: string): Promise<AnamneseTemplate> {
    const { data } = await api.get<ApiResponse<AnamneseTemplate>>(`/api/anamnese-templates/${id}`);
    return data.data;
  },

  async criarModeloAnamnese(payload: {
    nome: string;
    especialidade?: string | null;
    campos: AnamneseTemplate['campos'];
  }): Promise<AnamneseTemplate> {
    const { data } = await api.post<ApiResponse<AnamneseTemplate>>('/api/anamnese-templates', payload);
    return data.data;
  },

  async atualizarModeloAnamnese(
    id: string,
    payload: { nome: string; especialidade?: string | null; campos: AnamneseTemplate['campos'] },
  ): Promise<AnamneseTemplate> {
    const { data } = await api.put<ApiResponse<AnamneseTemplate>>(
      `/api/anamnese-templates/${id}`,
      payload,
    );
    return data.data;
  },

  async desativarModeloAnamnese(id: string): Promise<void> {
    await api.delete(`/api/anamnese-templates/${id}`);
  },

  async listarAnamneses(atendimentoId: string): Promise<AnamneseRecord[]> {
    const { data } = await api.get<ApiResponse<AnamneseRecord[]>>(
      `/api/clinical-encounters/${atendimentoId}/anamneses`,
    );
    return data.data;
  },

  async criarAnamnese(
    atendimentoId: string,
    payload: { modeloAnamneseId: string; respostasJson: string },
  ): Promise<AnamneseRecord> {
    const { data } = await api.post<ApiResponse<AnamneseRecord>>(
      `/api/clinical-encounters/${atendimentoId}/anamneses`,
      payload,
    );
    return data.data;
  },

  async atualizarAnamnese(
    id: string,
    payload: { respostasJson: string; resumoAlteracao?: string },
  ): Promise<AnamneseRecord> {
    const { data } = await api.put<ApiResponse<AnamneseRecord>>(
      `/api/clinical-encounters/anamneses/${id}`,
      payload,
    );
    return data.data;
  },

  async listarAvaliacoesPaciente(pacienteId: string): Promise<BodyAssessment[]> {
    const { data } = await api.get<ApiResponse<BodyAssessment[]>>(
      `/api/patients/${pacienteId}/body-assessments`,
    );
    return data.data;
  },

  async listarAvaliacoes(atendimentoId: string): Promise<BodyAssessment[]> {
    const { data } = await api.get<ApiResponse<BodyAssessment[]>>(
      `/api/clinical-encounters/${atendimentoId}/body-assessments`,
    );
    return data.data;
  },

  async criarAvaliacao(atendimentoId: string, payload: object): Promise<BodyAssessment> {
    const { data } = await api.post<ApiResponse<BodyAssessment>>(
      `/api/clinical-encounters/${atendimentoId}/body-assessments`,
      payload,
    );
    return data.data;
  },

  async obterAvaliacao(id: string): Promise<BodyAssessment> {
    const { data } = await api.get<ApiResponse<BodyAssessment>>(
      `/api/clinical-encounters/body-assessments/${id}`,
    );
    return data.data;
  },

  async atualizarAvaliacao(id: string, payload: object): Promise<BodyAssessment> {
    const { data } = await api.put<ApiResponse<BodyAssessment>>(
      `/api/clinical-encounters/body-assessments/${id}`,
      payload,
    );
    return data.data;
  },

  async obterEvolucao(pacienteId: string): Promise<BodyEvolutionPoint[]> {
    const { data } = await api.get<ApiResponse<BodyEvolutionPoint[]>>(
      `/api/patients/${pacienteId}/body-evolution`,
    );
    return data.data;
  },

  async listarAnexos(atendimentoId: string, tipo?: TipoAnexoClinico): Promise<ClinicalAttachment[]> {
    const { data } = await api.get<ApiResponse<ClinicalAttachment[]>>(
      `/api/clinical-encounters/${atendimentoId}/attachments`,
      { params: tipo ? { tipo } : undefined },
    );
    return data.data;
  },

  async enviarAnexo(atendimentoId: string, form: FormData): Promise<ClinicalAttachment> {
    const { data } = await api.post<ApiResponse<ClinicalAttachment>>(
      `/api/clinical-encounters/${atendimentoId}/attachments`,
      form,
    );
    return data.data;
  },

  async listarFotosPaciente(pacienteId: string): Promise<ComparativePhoto[]> {
    const { data } = await api.get<ApiResponse<ComparativePhoto[]>>(
      `/api/patients/${pacienteId}/photos`,
    );
    return data.data;
  },

  async listarFotos(atendimentoId: string): Promise<ComparativePhoto[]> {
    const { data } = await api.get<ApiResponse<ComparativePhoto[]>>(
      `/api/clinical-encounters/${atendimentoId}/photos`,
    );
    return data.data;
  },

  async enviarFoto(atendimentoId: string, form: FormData): Promise<ComparativePhoto> {
    const { data } = await api.post<ApiResponse<ComparativePhoto>>(
      `/api/clinical-encounters/${atendimentoId}/photos`,
      form,
    );
    return data.data;
  },

  async compararFotos(esquerdaId: string, direitaId: string): Promise<PhotoComparison> {
    const { data } = await api.get<ApiResponse<PhotoComparison>>(
      '/api/clinical-encounters/photos/compare',
      { params: { esquerdaId, direitaId } },
    );
    return data.data;
  },

  async listarVenta(atendimentoId: string): Promise<EnergyCalculation[]> {
    const { data } = await api.get<ApiResponse<EnergyCalculation[]>>(
      `/api/clinical-encounters/${atendimentoId}/energy-calculations`,
    );
    return data.data;
  },

  async criarVenta(atendimentoId: string, payload: object): Promise<EnergyCalculation> {
    const { data } = await api.post<ApiResponse<EnergyCalculation>>(
      `/api/clinical-encounters/${atendimentoId}/energy-calculations`,
      payload,
    );
    return data.data;
  },

  async listarRegraBolso(atendimentoId: string): Promise<PocketRule[]> {
    const { data } = await api.get<ApiResponse<PocketRule[]>>(
      `/api/clinical-encounters/${atendimentoId}/pocket-rules`,
    );
    return data.data;
  },

  async criarRegraBolso(atendimentoId: string, payload: object): Promise<PocketRule> {
    const { data } = await api.post<ApiResponse<PocketRule>>(
      `/api/clinical-encounters/${atendimentoId}/pocket-rules`,
      payload,
    );
    return data.data;
  },
};
