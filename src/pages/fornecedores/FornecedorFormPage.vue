<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { fornecedorService } from '@/services/fornecedor.service';
import { normalizarCnpj, OBSERVACAO_FORNECEDOR_MAX_CARACTERES } from '@/types/entidades/fornecedor';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.fornecedores.criar);
const podeEditar = usePermissao(permissoes.fornecedores.editar);
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));

const carregando = ref(false);
const salvando = ref(false);

const isEdicao = computed(() => route.name === 'fornecedores-editar');
const fornecedorId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
  cnpj: '',
  telefone: '',
  email: '',
  observacao: '',
});

function validarCnpj(value: string): boolean | string {
  const digitos = value.replace(/\D/g, '');

  return digitos.length === 14 || 'Informe um CNPJ válido com 14 dígitos';
}

function validarEmail(value: string): boolean | string {
  if (!value) {
    return true;
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return emailValido || 'Informe um e-mail válido';
}

function montarPayload() {
  return {
    nome: form.nome.trim(),
    cnpj: normalizarCnpj(form.cnpj),
    telefone: form.telefone.trim() || null,
    email: form.email.trim() || null,
    observacao: form.observacao.trim() || null,
  };
}

async function carregarFornecedor(): Promise<void> {
  if (!isEdicao.value || !fornecedorId.value) {
    return;
  }

  carregando.value = true;

  try {
    const fornecedor = await fornecedorService.obter(fornecedorId.value);
    form.nome = fornecedor.nome;
    form.cnpj = fornecedor.cnpj;
    form.telefone = fornecedor.telefone ?? '';
    form.email = fornecedor.email ?? '';
    form.observacao = fornecedor.observacao ?? '';
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'fornecedores' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && fornecedorId.value) {
      await fornecedorService.atualizar(fornecedorId.value, payload);
      notificacao.sucesso('Fornecedor atualizado com sucesso.');
    } else {
      await fornecedorService.criar(payload);
      notificacao.sucesso('Fornecedor cadastrado com sucesso.');
    }

    await router.push({ name: 'fornecedores' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'fornecedores' });
}

onMounted(() => {
  void carregarFornecedor();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar fornecedor' : 'Novo fornecedor'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados do fornecedor.'
          : 'Cadastre um fornecedor vinculado à empresa.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome"
            outlined
            :readonly="!podeSalvar"
            :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome do fornecedor']"
          />

          <q-input
            v-model="form.cnpj"
            class="form-field--required"
            label="CNPJ"
            outlined
            mask="##.###.###/####-##"
            unmasked-value
            fill-mask
            :readonly="!podeSalvar"
            :rules="[validarCnpj]"
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.telefone"
                label="Telefone"
                outlined
                mask="(##) #####-####"
                unmasked-value
                fill-mask
                :readonly="!podeSalvar"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.email"
                label="E-mail"
                type="email"
                outlined
                :readonly="!podeSalvar"
                :rules="[validarEmail]"
              />
            </div>
          </div>

          <q-input
            v-model="form.observacao"
            label="Observação"
            outlined
            type="textarea"
            autogrow
            counter
            :maxlength="OBSERVACAO_FORNECEDOR_MAX_CARACTERES"
            :readonly="!podeSalvar"
            hint="Informações adicionais sobre o fornecedor (opcional)."
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeSalvar"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
