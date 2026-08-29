<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { prontuarioService } from '@/services/prontuario.service';
import type { AnamneseField, TipoCampoAnamnese } from '@/types/entidades/prontuario';
import { TIPOS_CAMPO_ANAMNESE } from '@/types/entidades/prontuario';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const isEdicao = computed(() => route.name === 'modelos-anamnese-editar');
const carregando = ref(route.name === 'modelos-anamnese-editar');
const salvando = ref(false);

const form = reactive({
  nome: '',
  especialidade: '',
  campos: [] as AnamneseField[],
});

function novoCampo(): AnamneseField {
  return {
    id: crypto.randomUUID(),
    tipo: 'TextoCurto',
    label: '',
    obrigatorio: false,
    opcoes: [],
  };
}

function adicionarCampo(): void {
  form.campos.push(novoCampo());
}

function removerCampo(id: string): void {
  form.campos = form.campos.filter((campo) => campo.id !== id);
}

async function carregar(): Promise<void> {
  if (!isEdicao.value) {
    form.campos = [novoCampo()];
    return;
  }

  carregando.value = true;
  try {
    const modelo = await prontuarioService.obterModeloAnamnese(route.params.id as string);
    form.nome = modelo.nome;
    form.especialidade = modelo.especialidade ?? '';
    form.campos = modelo.campos.length > 0 ? modelo.campos : [novoCampo()];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'modelos-anamnese' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;
  try {
    const payload = {
      nome: form.nome.trim(),
      especialidade: form.especialidade.trim() || null,
      campos: form.campos.map((campo) => ({
        ...campo,
        label: campo.label.trim(),
        opcoes: campo.opcoes?.filter((opcao) => opcao.trim()) ?? [],
      })),
    };

    if (isEdicao.value) {
      await prontuarioService.atualizarModeloAnamnese(route.params.id as string, payload);
    } else {
      await prontuarioService.criarModeloAnamnese(payload);
    }

    notificacao.sucesso('Modelo salvo.');
    await router.push({ name: 'modelos-anamnese' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function atualizarTipo(campo: AnamneseField, tipo: TipoCampoAnamnese): void {
  campo.tipo = tipo;
}

onMounted(() => {
  void carregar();
});
</script>

<template>
  <q-page class="page-content page-content--form-wide q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar modelo' : 'Novo modelo de anamnese'"
      :subtitulo="
        isEdicao
          ? 'Atualize as perguntas do questionário da clínica.'
          : 'Monte um questionário reutilizável em qualquer atendimento.'
      "
    />

    <q-card v-if="carregando" flat bordered>
      <q-card-section>
        <app-table-skeleton :columns="3" />
      </q-card-section>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section>
        <q-form class="form-stack" @submit.prevent="salvar">
          <q-input
            v-model="form.nome"
            class="form-field--required"
            outlined
            label="Nome"
            :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome do modelo']"
          />
          <q-input v-model="form.especialidade" outlined label="Especialidade" />

          <div
            v-for="campo in form.campos"
            :key="campo.id"
            class="campo-card"
          >
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-8">
                <q-input
                  v-model="campo.label"
                  class="form-field--required"
                  outlined
                  label="Pergunta"
                  :rules="[(value: string) => Boolean(value?.trim()) || 'Informe a pergunta']"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  :model-value="campo.tipo"
                  :options="TIPOS_CAMPO_ANAMNESE"
                  emit-value
                  map-options
                  outlined
                  label="Tipo"
                  @update:model-value="(valor) => atualizarTipo(campo, valor)"
                />
              </div>
            </div>
            <q-toggle v-model="campo.obrigatorio" label="Obrigatório" color="primary" />
            <q-input
              v-if="campo.tipo === 'SelecaoUnica' || campo.tipo === 'SelecaoMultipla'"
              :model-value="(campo.opcoes || []).join(', ')"
              outlined
              label="Opções (separadas por vírgula)"
              @update:model-value="(valor) => (campo.opcoes = String(valor).split(',').map((item) => item.trim()))"
            />
            <div v-if="campo.tipo === 'Escala'" class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input v-model.number="campo.min" type="number" outlined label="Mínimo" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model.number="campo.max" type="number" outlined label="Máximo" />
              </div>
            </div>
            <q-btn
              v-if="form.campos.length > 1"
              flat
              color="negative"
              no-caps
              label="Remover"
              @click="removerCampo(campo.id)"
            />
          </div>

          <q-btn outline color="primary" no-caps label="Adicionar campo" @click="adicionarCampo" />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              unelevated
              color="primary"
              type="submit"
              label="Salvar"
              no-caps
              :disable="salvando"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps :to="{ name: 'modelos-anamnese' }" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped lang="scss">
.campo-card {
  display: grid;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
}
</style>
