<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { tipoProdutoService } from '@/services/tipo-produto.service';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);

const isEdicao = computed(() => route.name === 'tipos-produto-editar');
const tipoProdutoId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
});

async function carregarTipoProduto(): Promise<void> {
  if (!isEdicao.value || !tipoProdutoId.value) {
    return;
  }

  carregando.value = true;

  try {
    const tipo = await tipoProdutoService.obter(tipoProdutoId.value);
    form.nome = tipo.nome;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'tipos-produto' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    if (isEdicao.value && tipoProdutoId.value) {
      await tipoProdutoService.atualizar(tipoProdutoId.value, {
        nome: form.nome,
      });
      notificacao.sucesso('Tipo de produto atualizado com sucesso.');
    } else {
      await tipoProdutoService.criar({
        nome: form.nome,
      });
      notificacao.sucesso('Tipo de produto cadastrado com sucesso.');
    }

    await router.push({ name: 'tipos-produto' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'tipos-produto' });
}

onMounted(() => {
  void carregarTipoProduto();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar tipo de produto' : 'Novo tipo de produto'"
      :subtitulo="
        isEdicao
          ? 'Atualize o nome do tipo.'
          : 'Cadastre um tipo para classificar os produtos do estoque.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <q-input
            v-model="form.nome"
            label="Nome"
            outlined
            :readonly="!isAdmin"
            :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome do tipo']"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!isAdmin"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
