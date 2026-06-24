<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { IdentidadeConstants } from '@/constants/identidade';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const etapa = ref<1 | 2>(1);
const validando = ref(false);
const concluindo = ref(false);
const mostrarSenha = ref(false);
const mostrarConfirmarSenha = ref(false);

const dadosValidados = ref<{ nome: string; email: string } | null>(null);

const token = computed(() => {
  const value = route.query.token;

  return typeof value === 'string' ? value : '';
});

const possuiToken = computed(() => Boolean(token.value));

const formEmail = reactive({
  email: typeof route.query.email === 'string' ? route.query.email : '',
});

const formSenha = reactive({
  senha: '',
  confirmarSenha: '',
});

const tituloEtapa = computed(() => {
  if (!possuiToken.value) {
    return 'Link inválido';
  }

  if (etapa.value === 1) {
    return 'Primeiro acesso';
  }

  return `Olá, ${dadosValidados.value?.nome ?? ''}`;
});

const subtituloEtapa = computed(() => {
  if (!possuiToken.value) {
    return 'Use o link de convite enviado para o seu e-mail.';
  }

  if (etapa.value === 1) {
    return 'Confirme o e-mail cadastrado pela clínica para continuar.';
  }

  return 'Crie sua senha para acessar a plataforma.';
});

function validarConfirmacaoSenha(value: string): boolean | string {
  return value === formSenha.senha || 'As senhas não conferem';
}

async function validarEmail(): Promise<void> {
  validando.value = true;

  try {
    const resultado = await authService.validarEmailPrimeiroAcesso({
      token: token.value,
      email: formEmail.email.trim(),
    });

    dadosValidados.value = resultado;
    etapa.value = 2;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    validando.value = false;
  }
}

async function concluirPrimeiroAcesso(): Promise<void> {
  if (!dadosValidados.value) {
    return;
  }

  concluindo.value = true;

  try {
    const response = await authService.concluirPrimeiroAcesso({
      token: token.value,
      email: dadosValidados.value.email,
      senha: formSenha.senha,
    });

    authStore.persistirSessao(response.token, response.usuario);
    await authStore.sincronizarUsuario();
    notificacao.sucesso('Senha criada com sucesso. Bem-vindo!');
    await router.push({ name: 'dashboard' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    concluindo.value = false;
  }
}

function voltarParaEmail(): void {
  etapa.value = 1;
  formSenha.senha = '';
  formSenha.confirmarSenha = '';
}
</script>

<template>
  <app-auth-shell
    variant="login"
    :form-title="tituloEtapa"
    :form-subtitle="subtituloEtapa"
  >
    <div v-if="!possuiToken" class="primeiro-acesso__sem-token">
      <q-banner dense rounded class="primeiro-acesso__banner">
        <template #avatar>
          <q-icon name="mail" color="primary" />
        </template>
        Abra o link recebido no e-mail de convite. Se não encontrar, peça à clínica para reenviar
        o convite.
      </q-banner>

      <q-btn
        flat
        no-caps
        color="primary"
        label="Ir para o login"
        class="full-width q-mt-md"
        :to="{ name: 'login' }"
      />
    </div>

    <q-form
      v-else-if="etapa === 1"
      class="auth-premium__form-stack"
      @submit.prevent="validarEmail"
    >
      <q-input
        v-model="formEmail.email"
        label="E-mail de login"
        type="email"
        outlined
        autocomplete="email"
        class="ds-animate-fade-in-up ds-stagger-1"
        :rules="[(value: string) => Boolean(value) || 'Informe o e-mail']"
      />

      <q-btn
        color="primary"
        label="Continuar"
        type="submit"
        unelevated
        no-caps
        class="full-width auth-premium__submit ds-animate-fade-in-up ds-stagger-2"
        :loading="validando"
      />
    </q-form>

    <q-form
      v-else
      class="auth-premium__form-stack"
      @submit.prevent="concluirPrimeiroAcesso"
    >
      <q-input
        v-model="formSenha.senha"
        label="Senha"
        :type="mostrarSenha ? 'text' : 'password'"
        outlined
        autocomplete="new-password"
        class="ds-animate-fade-in-up ds-stagger-1"
        :rules="[
          (value: string) => Boolean(value) || 'Informe a senha',
          (value: string) =>
            value.length >= IdentidadeConstants.senhaMinimaCaracteres ||
            `Mínimo de ${IdentidadeConstants.senhaMinimaCaracteres} caracteres`,
        ]"
      >
        <template #append>
          <q-btn
            flat
            round
            dense
            :icon="mostrarSenha ? 'visibility_off' : 'visibility'"
            :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
            @click="mostrarSenha = !mostrarSenha"
          />
        </template>
      </q-input>

      <q-input
        v-model="formSenha.confirmarSenha"
        label="Confirmar senha"
        :type="mostrarConfirmarSenha ? 'text' : 'password'"
        outlined
        autocomplete="new-password"
        class="ds-animate-fade-in-up ds-stagger-2"
        :rules="[
          (value: string) => Boolean(value) || 'Confirme a senha',
          validarConfirmacaoSenha,
        ]"
      >
        <template #append>
          <q-btn
            flat
            round
            dense
            :icon="mostrarConfirmarSenha ? 'visibility_off' : 'visibility'"
            :aria-label="mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'"
            @click="mostrarConfirmarSenha = !mostrarConfirmarSenha"
          />
        </template>
      </q-input>

      <q-btn
        color="primary"
        label="Criar senha e entrar"
        type="submit"
        unelevated
        no-caps
        class="full-width auth-premium__submit ds-animate-fade-in-up ds-stagger-3"
        :loading="concluindo"
      />

      <q-btn
        flat
        no-caps
        color="primary"
        label="Voltar"
        class="full-width ds-animate-fade-in-up ds-stagger-4"
        @click="voltarParaEmail"
      />
    </q-form>

    <p v-if="possuiToken" class="auth-premium__footer-link ds-animate-fade-in-up ds-stagger-5">
      Já tem senha?
      <router-link :to="{ name: 'login' }">Entrar</router-link>
    </p>
  </app-auth-shell>
</template>

<style scoped lang="scss">
.primeiro-acesso__banner {
  background: var(--ds-bg-subtle);
  color: var(--ds-text-primary);
}

.primeiro-acesso__sem-token {
  display: grid;
  gap: var(--ds-space-3);
}
</style>
