import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth.store';
import { resolverRotaInicial } from '@/utils/resolver-rota-inicial';

import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const permissao = to.meta.permissao;

  if (to.meta.publica) {
    if (
      authStore.isAutenticado &&
      (to.name === 'login' || to.name === 'cadastro' || to.name === 'primeiro-acesso')
    ) {
      return resolverRotaInicial(authStore);
    }

    return true;
  }

  if (!authStore.isAutenticado) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  if (permissao && !authStore.possuiPermissao(permissao)) {
    const destino = resolverRotaInicial(authStore);

    if (to.name === destino.name) {
      return true;
    }

    return destino;
  }

  return true;
});

export default router;
