import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import type { LoginResult, RegistrarRequest } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  const router = useRouter();
  const authStore = useAuthStore();
  const { usuario, carregando, isAutenticado, permissoes } = storeToRefs(authStore);

  async function login(
    email: string,
    senha: string,
    empresaId?: string | null,
  ): Promise<LoginResult> {
    const result = await authStore.login({ email, senha, empresaId: empresaId ?? null });

    if (result.status === 'authenticated') {
      await router.push({ name: 'dashboard' });
    }

    return result;
  }

  async function registrar(payload: RegistrarRequest): Promise<void> {
    await authStore.registrar(payload);
  }

  async function logout(): Promise<void> {
    authStore.logout();
    await router.push({ name: 'login' });
  }

  return {
    usuario,
    carregando,
    isAutenticado,
    isAdmin: computed(() => authStore.isAdmin),
    permissoes,
    login,
    registrar,
    logout,
    possuiPermissao: authStore.possuiPermissao,
  };
}
