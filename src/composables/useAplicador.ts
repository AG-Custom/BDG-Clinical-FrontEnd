import { useAdmin } from '@/composables/useAdmin';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useAuthStore } from '@/stores/auth.store';

export function useAplicador() {
  const authStore = useAuthStore();
  const { isAplicador } = storeToRefs(authStore);
  const { isAdmin } = useAdmin();

  const podeGerenciarAplicacoes = computed(() => isAdmin.value || isAplicador.value);

  return {
    isAplicador,
    podeGerenciarAplicacoes,
  };
}
