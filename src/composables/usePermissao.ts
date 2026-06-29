import { computed } from 'vue';

import { useAuthStore } from '@/stores/auth.store';

export function usePermissao(permissao: string) {
  const authStore = useAuthStore();

  return computed(() => authStore.possuiPermissao(permissao));
}

export function usePermissoes() {
  const authStore = useAuthStore();

  return {
    possuiPermissao: (chave: string) => authStore.possuiPermissao(chave),
    possuiAlguma: (chaves: string[]) => authStore.possuiAlgumaPermissao(chaves),
    possuiTodas: (chaves: string[]) => authStore.possuiTodasPermissoes(chaves),
    possuiModulo: (moduleCode: string) => authStore.possuiModulo(moduleCode),
    isAdmin: computed(() => authStore.isAdmin),
  };
}
