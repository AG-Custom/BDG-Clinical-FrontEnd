<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAuth } from '@/composables/useAuth';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { DesignSystemAuth } from '@/constants/design-system';
import type { EmpresaContexto } from '@/types/entidades/empresa';

type EtapaLogin = 'credenciais' | 'empresas';

const router = useRouter();
const auth = useAuth();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { carregando } = auth;

const etapa = ref<EtapaLogin>('credenciais');
const empresasDisponiveis = ref<EmpresaContexto[]>([]);

const form = reactive({
  email: '',
  senha: '',
});

const mostrarSenha = ref(false);

async function entrar(empresaId?: string): Promise<void> {
  try {
    const result = await auth.login(form.email, form.senha, empresaId);

    if (result.status === 'company_selection_required') {
      empresasDisponiveis.value = result.companies;
      etapa.value = 'empresas';
      return;
    }

    const redirect = router.currentRoute.value.query.redirect;

    if (typeof redirect === 'string') {
      await router.push(redirect);
    }
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function selecionarEmpresa(empresaId: string): Promise<void> {
  await entrar(empresaId);
}

function voltarParaCredenciais(): void {
  etapa.value = 'credenciais';
  empresasDisponiveis.value = [];
}
</script>

<template>
  <app-auth-shell
    variant="login"
    :form-title="etapa === 'credenciais' ? DesignSystemAuth.login.formTitle : 'Escolha a clínica'"
    :form-subtitle="
      etapa === 'credenciais'
        ? DesignSystemAuth.login.formSubtitle
        : 'Seu e-mail tem acesso a mais de uma clínica.'
    "
  >
    <q-form
      v-if="etapa === 'credenciais'"
      class="auth-premium__form-stack"
      @submit.prevent="entrar()"
    >
      <q-input
        v-model="form.email"
        label="E-mail"
        type="email"
        outlined
        autocomplete="email"
        class="ds-animate-fade-in-up ds-stagger-1"
        :rules="[(value: string) => Boolean(value) || 'Informe o e-mail']"
      />

      <q-input
        v-model="form.senha"
        label="Senha"
        :type="mostrarSenha ? 'text' : 'password'"
        outlined
        autocomplete="current-password"
        class="ds-animate-fade-in-up ds-stagger-2"
        :rules="[(value: string) => Boolean(value) || 'Informe a senha']"
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

      <q-btn
        color="primary"
        label="Continuar"
        type="submit"
        unelevated
        no-caps
        class="full-width auth-premium__submit ds-animate-fade-in-up ds-stagger-3"
        :loading="carregando"
      />
    </q-form>

    <div v-else class="login-empresas">
      <q-list class="login-empresas__list">
        <q-item
          v-for="empresa in empresasDisponiveis"
          :key="empresa.empresaId"
          clickable
          :disable="!empresa.ativo || carregando"
          @click="selecionarEmpresa(empresa.empresaId)"
        >
          <q-item-section avatar>
            <q-avatar v-if="empresa.logo" size="40px">
              <img :src="empresa.logo" :alt="`Logo ${empresa.nome}`" />
            </q-avatar>
            <q-avatar v-else size="40px" color="primary" text-color="white" icon="business" />
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ empresa.nome }}</q-item-label>
            <q-item-label v-if="!empresa.ativo" caption class="text-negative">
              Clínica inativa
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-spinner v-if="carregando" size="20px" color="primary" />
            <q-icon v-else name="chevron_right" color="grey-6" />
          </q-item-section>
        </q-item>
      </q-list>

      <q-btn
        flat
        color="primary"
        label="Voltar"
        no-caps
        class="full-width q-mt-md"
        :disable="carregando"
        @click="voltarParaCredenciais"
      />
    </div>

    <template v-if="etapa === 'credenciais'">
      <p class="auth-premium__footer-link ds-animate-fade-in-up ds-stagger-4">
        Foi convidado para a plataforma? Abra o link enviado para o seu e-mail.
      </p>

      <p class="auth-premium__footer-link ds-animate-fade-in-up ds-stagger-5">
        Ainda não tem conta?
        <router-link :to="{ name: 'cadastro' }">Cadastre-se grátis</router-link>
      </p>
    </template>
  </app-auth-shell>
</template>

<style scoped lang="scss">
.login-empresas {
  &__list {
    border: 1px solid var(--ds-border-default);
    border-radius: var(--ds-radius-md);
    overflow: hidden;
  }
}
</style>
