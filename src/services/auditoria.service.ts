import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type { EntityAuditSummary } from '@/types/entidades/auditoria';

function normalizarGuid(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  return String(valor).toLowerCase();
}

function normalizarResumoAuditoria(payload: unknown): EntityAuditSummary {
  if (!payload || typeof payload !== 'object') {
    return { idUsuarioCriacao: null, idUsuarioAtualizacao: null };
  }

  const raw = payload as Record<string, unknown>;

  return {
    idUsuarioCriacao: normalizarGuid(raw.idUsuarioCriacao ?? raw.IdUsuarioCriacao),
    idUsuarioAtualizacao: normalizarGuid(raw.idUsuarioAtualizacao ?? raw.IdUsuarioAtualizacao),
  };
}

export const auditoriaService = {
  async obterResumo(
    entidade: string,
    registroId: string,
    signal?: AbortSignal,
  ): Promise<EntityAuditSummary> {
    const { data } = await api.get<ApiResponse<EntityAuditSummary>>('/api/audit/summary', {
      params: { entidade, registroId },
      signal,
    });

    const envelope = data as ApiResponse<unknown> & { Data?: unknown };

    return normalizarResumoAuditoria(envelope.data ?? envelope.Data);
  },
};
