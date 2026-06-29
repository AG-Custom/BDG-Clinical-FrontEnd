<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { unidadeMedidaService } from '@/services/unidade-medida.service';
import {
  TIPOS_UNIDADE_MEDIDA,
  type TipoUnidadeMedida,
} from '@/types/entidades/unidade-medida';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.unidadesMedida.criar);
const podeEditar = usePermissao(permissoes.unidadesMedida.editar);
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));

const carregando = ref(false);
const salvando = ref(false);

const isEdicao = computed(() => route.name === 'unidades-medida-editar');
const unidadeMedidaId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
  sigla: '',
  tipo: null as TipoUnidadeMedida | null,
});

const opcoesTipos = TIPOS_UNIDADE_MEDIDA.map((tipo) => ({
  label: tipo,
  value: tipo,
}));

function validarTipo(value: TipoUnidadeMedida | null): boolean | string {
  return Boolean(value) || 'Selecione o tipo da unidade de medida';
}

async function carregarUnidadeMedida(): Promise<void> {
  if (!isEdicao.value || !unidadeMedidaId.value) {
    return;
  }

  carregando.value = true;

  try {
    const unidade = await unidadeMedidaService.obter(unidadeMedidaId.value);
    form.nome = unidade.nome;
    form.sigla = unidade.sigla;
    form.tipo = unidade.tipo;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'unidades-medida' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const payload = {
      nome: form.nome.trim(),
      sigla: form.sigla.trim(),
      tipo: form.tipo as TipoUnidadeMedida,
    };

    if (isEdicao.value && unidadeMedidaId.value) {
      await unidadeMedidaService.atualizar(unidadeMedidaId.value, payload);
      notificacao.sucesso('Unidade de medida atualizada com sucesso.');
    } else {
      await unidadeMedidaService.criar(payload);
      notificacao.sucesso('Unidade de medida cadastrada com sucesso.');
    }

    await router.push({ name: 'unidades-medida' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'unidades-medida' });
}

onMounted(() => {
  void carregarUnidadeMedida();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar unidade de medida' : 'Nova unidade de medida'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados da unidade de medida.'
          : 'Cadastre uma unidade para utilizar no estoque de produtos.'
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
            :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome']"
            hint="Ex.: Miligrama, Mililitro, Unidade"
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.sigla"
                class="form-field--required"
                label="Sigla"
                outlined
                :readonly="!podeSalvar"
                :rules="[(value: string) => Boolean(value?.trim()) || 'Informe a sigla']"
                hint="Ex.: mg, ml, un"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.tipo"
                class="form-field--required"
                :options="opcoesTipos"
                label="Tipo"
                outlined
                emit-value
                map-options
                :rules="[validarTipo]"
                :disable="!podeSalvar"
              />
            </div>
          </div>

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
