<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { permissoes } from '@/constants/permissoes';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { tagAgendamentoService } from '@/services/tag-agendamento.service';
import type { TagAgendamento } from '@/types/entidades/tag-agendamento';
import {
  CORES_PALETA_TAG_AGENDAMENTO,
  COR_PADRAO_TAG_AGENDAMENTO,
} from '@/types/entidades/tag-agendamento';
import { validarCorHex } from '@/utils/whitelabel';

const props = defineProps<{
  tag?: TagAgendamento | null;
}>();

const emit = defineEmits<{
  salvo: [tag: TagAgendamento];
  cancelar: [];
}>();

const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.tagsAgendamento.criar);
const podeEditar = usePermissao(permissoes.tagsAgendamento.editar);

const salvando = ref(false);
const isEdicao = computed(() => Boolean(props.tag?.id));
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));
const tituloPainel = computed(() => (isEdicao.value ? 'Editar tag' : 'Nova tag'));

const form = reactive({
  nome: '',
  cor: COR_PADRAO_TAG_AGENDAMENTO as string,
});

function preencherFormulario(): void {
  if (props.tag) {
    form.nome = props.tag.nome;
    form.cor = props.tag.cor;
    return;
  }

  form.nome = '';
  form.cor = COR_PADRAO_TAG_AGENDAMENTO;
}

function selecionarCor(cor: string): void {
  form.cor = cor;
}

function cancelar(): void {
  if (salvando.value) {
    return;
  }

  emit('cancelar');
}

async function salvar(): Promise<void> {
  if (!form.nome.trim()) {
    notificacao.info('Informe o nome da tag.');
    return;
  }

  if (!validarCorHex(form.cor)) {
    notificacao.info('Informe uma cor válida no formato #RGB ou #RRGGBB.');
    return;
  }

  salvando.value = true;

  try {
    const payload = {
      nome: form.nome.trim(),
      cor: form.cor,
    };

    const tag = isEdicao.value && props.tag
      ? await tagAgendamentoService.atualizar(props.tag.id, payload)
      : await tagAgendamentoService.criar(payload);

    notificacao.sucesso(isEdicao.value ? 'Tag atualizada.' : 'Tag cadastrada.');
    emit('salvo', tag);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

onMounted(() => {
  preencherFormulario();
});
</script>

<template>
  <div class="tag-agendamento-form-dialog">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">{{ tituloPainel }}</div>
      <q-space />
      <q-btn
        flat
        round
        dense
        icon="close"
        aria-label="Voltar"
        :disable="salvando"
        @click="cancelar"
      />
    </q-card-section>

    <q-card-section>
      <q-form class="form-stack" @submit.prevent="salvar">
        <q-input
          v-model="form.nome"
          class="form-field--required"
          label="Nome"
          outlined
          maxlength="80"
          :disable="salvando || !podeSalvar"
          :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome da tag']"
        />

        <div>
          <div class="tag-agendamento-form-dialog__cor-label">Cor *</div>
          <div class="tag-agendamento-form-dialog__paleta">
            <button
              v-for="cor in CORES_PALETA_TAG_AGENDAMENTO"
              :key="cor"
              type="button"
              class="tag-agendamento-form-dialog__swatch"
              :class="{
                'tag-agendamento-form-dialog__swatch--ativa':
                  form.cor.toUpperCase() === cor.toUpperCase(),
              }"
              :style="{ backgroundColor: cor }"
              :disabled="salvando || !podeSalvar"
              :aria-label="`Selecionar cor ${cor}`"
              @click="selecionarCor(cor)"
            />
          </div>

          <div class="row items-center q-gutter-sm q-mt-sm">
            <q-input
              v-model="form.cor"
              label="Hex"
              outlined
              class="col"
              :disable="salvando || !podeSalvar"
              :rules="[
                (value: string) => Boolean(value) || 'Informe a cor da tag',
                (value: string) => validarCorHex(value) || 'Use o formato #RGB ou #RRGGBB',
              ]"
            />
            <q-btn
              outline
              no-caps
              color="primary"
              icon="colorize"
              label="Personalizar"
              :disable="salvando || !podeSalvar"
            >
              <q-popup-proxy>
                <q-color
                  v-model="form.cor"
                  format-model="hex"
                  no-header
                  no-footer
                  style="max-width: 220px"
                />
              </q-popup-proxy>
            </q-btn>
          </div>
        </div>
      </q-form>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-md">
      <q-btn flat label="Voltar" color="primary" no-caps :disable="salvando" @click="cancelar" />
      <q-btn
        unelevated
        :label="salvando ? 'Salvando' : 'Salvar'"
        color="primary"
        no-caps
        :disable="salvando || !podeSalvar"
        @click="salvar"
      />
    </q-card-actions>
  </div>
</template>

<style scoped lang="scss">
.tag-agendamento-form-dialog {
  &__cor-label {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
    margin-bottom: var(--ds-space-2);
  }

  &__paleta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-space-2);
  }

  &__swatch {
    border: 2px solid transparent;
    border-radius: var(--ds-radius-md);
    cursor: pointer;
    height: 28px;
    padding: 0;
    width: 28px;

    &:disabled {
      cursor: default;
      opacity: 0.6;
    }

    &--ativa {
      border-color: var(--ds-text-primary);
      outline: 2px solid var(--ds-bg-surface);
      outline-offset: -4px;
    }
  }
}
</style>
