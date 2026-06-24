<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { unidadeService } from '@/services/unidade.service';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);

const isEdicao = computed(() => route.name === 'unidades-editar');
const unidadeId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
  endereco: '',
});

async function carregarUnidade(): Promise<void> {
  if (!isEdicao.value || !unidadeId.value) {
    return;
  }

  carregando.value = true;

  try {
    const unidade = await unidadeService.obter(unidadeId.value);
    form.nome = unidade.nome;
    form.endereco = unidade.endereco;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'unidades' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    if (isEdicao.value && unidadeId.value) {
      await unidadeService.atualizar(unidadeId.value, {
        nome: form.nome,
        endereco: form.endereco,
      });
      notificacao.sucesso('Unidade atualizada com sucesso.');
    } else {
      await unidadeService.criar({
        nome: form.nome,
        endereco: form.endereco,
      });
      notificacao.sucesso('Unidade cadastrada com sucesso.');
    }

    await router.push({ name: 'unidades' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'unidades' });
}

onMounted(() => {
  void carregarUnidade();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar unidade' : 'Nova unidade'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados da unidade.'
          : 'Cadastre uma nova unidade da clínica.'
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
            :rules="[(value: string) => Boolean(value) || 'Informe o nome da unidade']"
          />

          <q-input
            v-model="form.endereco"
            label="Endereço"
            outlined
            type="textarea"
            autogrow
            :readonly="!isAdmin"
            :rules="[(value: string) => Boolean(value) || 'Informe o endereço']"
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
