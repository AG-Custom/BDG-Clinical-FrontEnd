import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import '@/css/app.scss';

import { createPinia } from 'pinia';
import { Notify, Quasar } from 'quasar';
import { createApp } from 'vue';

import App from './App.vue';
import { registerGlobalComponents } from './boot';
import router from './router';
import { useAuthStore } from './stores/auth.store';
import { aplicarMarcaDocumento } from './utils/whitelabel';

async function iniciar(): Promise<void> {
  const app = createApp(App);

  app.use(createPinia());

  const authStore = useAuthStore();
  await authStore.inicializar();

  if (authStore.empresaAtual) {
    aplicarMarcaDocumento({
      nome: authStore.empresaAtual.nome,
      logo: authStore.empresaAtual.logo,
    });
  }

  app.use(router);
  app.use(Quasar, {
    plugins: {
      Notify,
    },
  });

  registerGlobalComponents(app);

  app.mount('#app');
}

void iniciar();
