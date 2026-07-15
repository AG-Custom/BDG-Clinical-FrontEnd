import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type {
  CancelarCompraPacienteRequest,
  CompraPaciente,
  CriarCompraPacienteRequest,
  ListarComprasPacienteParams,
  SaldoCompraPaciente,
} from '@/types/entidades/compra-paciente';
import { normalizarCompraPaciente } from '@/types/entidades/compra-paciente';

function normalizarLista(compras: CompraPaciente[] | null | undefined): CompraPaciente[] {
  return (compras ?? []).map(normalizarCompraPaciente);
}

export const compraPacienteService = {
  async listar(params: ListarComprasPacienteParams = {}): Promise<CompraPaciente[]> {
    const query: Record<string, string> = {};

    if (params.pacienteId) {
      query.pacienteId = params.pacienteId;
    }

    if (params.status) {
      query.status = params.status;
    }

    const { data } = await api.get<ApiResponse<CompraPaciente[]>>('/api/patient-purchases', {
      params: Object.keys(query).length > 0 ? query : undefined,
    });

    return normalizarLista(data.data);
  },

  async listarPorPaciente(
    patientId: string,
    params: ListarComprasPacienteParams = {},
  ): Promise<CompraPaciente[]> {
    const query: Record<string, string> = {};

    if (params.status) {
      query.status = params.status;
    }

    const { data } = await api.get<ApiResponse<CompraPaciente[]>>(
      `/api/patients/${patientId}/purchases`,
      {
        params: Object.keys(query).length > 0 ? query : undefined,
      },
    );

    return normalizarLista(data.data);
  },

  async listarAtivasPorPaciente(patientId: string): Promise<CompraPaciente[]> {
    const { data } = await api.get<ApiResponse<CompraPaciente[]>>(
      `/api/patients/${patientId}/purchases/active`,
    );

    return normalizarLista(data.data);
  },

  async criar(patientId: string, payload: CriarCompraPacienteRequest): Promise<CompraPaciente> {
    const { data } = await api.post<ApiResponse<CompraPaciente>>(
      `/api/patients/${patientId}/purchases`,
      payload,
    );

    return normalizarCompraPaciente(data.data);
  },

  async obter(id: string): Promise<CompraPaciente> {
    const { data } = await api.get<ApiResponse<CompraPaciente>>(`/api/patient-purchases/${id}`);

    return normalizarCompraPaciente(data.data);
  },

  async obterSaldo(id: string): Promise<SaldoCompraPaciente> {
    const { data } = await api.get<ApiResponse<SaldoCompraPaciente>>(
      `/api/patient-purchases/${id}/balance`,
    );

    return data.data;
  },

  async cancelar(
    id: string,
    payload: CancelarCompraPacienteRequest = {},
  ): Promise<CompraPaciente> {
    const { data } = await api.post<ApiResponse<CompraPaciente>>(
      `/api/patient-purchases/${id}/cancel`,
      payload,
    );

    return normalizarCompraPaciente(data.data);
  },
};
