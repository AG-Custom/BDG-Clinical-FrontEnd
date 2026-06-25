<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { cargoService } from '@/services/cargo.service';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);

const isEdicao = computed(() => route.name === 'cargos-editar');
const cargoId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
});

async function carregarCargo(): Promise<void> {
  if (!isEdicao.value || !cargoId.value) {
    return;
  }

  carregando.value = true;

  try {
    const cargo = await cargoService.obter(cargoId.value);
    form.nome = cargo.nome;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'cargos' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    if (isEdicao.value && cargoId.value) {
      await cargoService.atualizar(cargoId.value, {
        nome: form.nome,
      });
      notificacao.sucesso('Cargo atualizado com sucesso.');
    } else {
      await cargoService.criar({
        nome: form.nome,
      });
      notificacao.sucesso('Cargo cadastrado com sucesso.');
    }

    await router.push({ name: 'cargos' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'cargos' });
}

onMounted(() => {
  void carregarCargo();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar cargo' : 'Novo cargo'"
      :subtitulo="
        isEdicao
          ? 'Atualize o nome do cargo.'
          : 'Cadastre um novo cargo para vincular aos colaboradores.'
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
            :rules="[(value: string) => Boolean(value) || 'Informe o nome do cargo']"
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
