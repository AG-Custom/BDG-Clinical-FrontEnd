import { api } from '@/boot/axios';
import type { ApiResponse } from '@/types/api/api';
import type { NoMapaPermissao } from '@/types/entidades/permissao';

let mapaCache: NoMapaPermissao[] | null = null;
let mapaCacheEmpresaId: string | null = null;

export const permissaoService = {
  invalidarCacheMapa(): void {
    mapaCache = null;
    mapaCacheEmpresaId = null;
  },

  async obterMapa(empresaId?: string | null): Promise<NoMapaPermissao[]> {
    if (mapaCache && (!empresaId || mapaCacheEmpresaId === empresaId)) {
      return mapaCache;
    }

    const { data } = await api.get<ApiResponse<NoMapaPermissao[]>>('/api/permissions/map');

    mapaCache = data.data ?? [];
    mapaCacheEmpresaId = empresaId ?? null;

    return mapaCache;
  },
};
