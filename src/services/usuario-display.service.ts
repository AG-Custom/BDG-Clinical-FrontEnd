import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';

export const usuarioDisplayService = {
  async resolverNomes(ids: string[], signal?: AbortSignal): Promise<Map<string, string>> {
    const distintos = [...new Set(ids.filter(Boolean))];

    if (distintos.length === 0) {
      return new Map();
    }

    const { data } = await api.post<ApiResponse<unknown[]>>(
      '/api/users/display-names',
      { ids: distintos },
      { signal },
    );

    const envelope = data as ApiResponse<unknown[]> & { Data?: unknown[] };
    const itens = envelope.data ?? envelope.Data ?? [];

    const resultado = new Map<string, string>();

    for (const item of itens) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const registro = item as Record<string, unknown>;
      const id = registro.id ?? registro.Id;
      const nome = registro.nome ?? registro.Nome;

      if (id != null && typeof nome === 'string') {
        resultado.set(String(id).toLowerCase(), nome);
      }
    }

    return resultado;
  },
};
