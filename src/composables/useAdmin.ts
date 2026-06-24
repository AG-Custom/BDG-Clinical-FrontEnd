import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useAuthStore } from '@/stores/auth.store';

export function useAdmin() {
  const authStore = useAuthStore();
  const { isAdmin } = storeToRefs(authStore);

  return {
    isAdmin,
    isFuncionario: computed(() => !isAdmin.value),
  };
}
