<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { sintomaService } from '@/services/sintoma.service';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);

const isEdicao = computed(() => route.name === 'sintomas-editar');
const sintomaId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
});

async function carregarSintoma(): Promise<void> {
  if (!isEdicao.value || !sintomaId.value) {
    return;
  }

  carregando.value = true;

  try {
    const sintoma = await sintomaService.obter(sintomaId.value);
    form.nome = sintoma.nome;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'sintomas' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    if (isEdicao.value && sintomaId.value) {
      await sintomaService.atualizar(sintomaId.value, {
        nome: form.nome,
      });
      notificacao.sucesso('Sintoma atualizado com sucesso.');
    } else {
      await sintomaService.criar({
        nome: form.nome,
      });
      notificacao.sucesso('Sintoma cadastrado com sucesso.');
    }

    await router.push({ name: 'sintomas' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'sintomas' });
}

onMounted(() => {
  void carregarSintoma();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar sintoma' : 'Novo sintoma'"
      :subtitulo="
        isEdicao
          ? 'Atualize o nome do sintoma.'
          : 'Cadastre um sintoma para registrar em aplicações.'
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
            :readonly="!isAdmin"
            :rules="[(value: string) => Boolean(value) || 'Informe o nome do sintoma']"
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
