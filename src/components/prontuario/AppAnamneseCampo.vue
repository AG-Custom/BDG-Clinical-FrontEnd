<script setup lang="ts">
import { computed } from 'vue';

import type { AnamneseField } from '@/types/entidades/prontuario';

const props = defineProps<{
  campo: AnamneseField;
}>();

const model = defineModel<string | number | boolean | string[] | null>({ default: null });

const texto = computed({
  get: () => {
    const valor = model.value;
    if (valor == null || typeof valor === 'boolean' || Array.isArray(valor)) {
      return '';
    }

    return String(valor);
  },
  set: (valor: string | number | null) => {
    if (props.campo.tipo === 'Numero') {
      if (valor === '' || valor == null) {
        model.value = null;
        return;
      }

      model.value = Number(valor);
      return;
    }

    model.value = valor;
  },
});

const numero = computed({
  get: () => {
    const valor = model.value;
    return typeof valor === 'number' ? valor : Number(valor) || 0;
  },
  set: (valor: number) => {
    model.value = valor;
  },
});

const marcado = computed({
  get: () => model.value === true,
  set: (valor: boolean) => {
    model.value = valor;
  },
});

const selecao = computed({
  get: () => {
    if (props.campo.tipo === 'SelecaoMultipla') {
      return Array.isArray(model.value) ? model.value : [];
    }

    return typeof model.value === 'string' ? model.value : null;
  },
  set: (valor: string | string[] | null) => {
    model.value = valor;
  },
});
</script>

<template>
  <q-input
    v-if="campo.tipo === 'TextoCurto' || campo.tipo === 'TextoLongo' || campo.tipo === 'Numero' || campo.tipo === 'Data'"
    v-model="texto"
    :label="campo.label"
    outlined
    :type="campo.tipo === 'TextoLongo' ? 'textarea' : campo.tipo === 'Numero' ? 'number' : 'text'"
    :autogrow="campo.tipo === 'TextoLongo'"
  />
  <q-select
    v-else-if="campo.tipo === 'SelecaoUnica' || campo.tipo === 'SelecaoMultipla'"
    v-model="selecao"
    :options="campo.opcoes || []"
    :label="campo.label"
    outlined
    :multiple="campo.tipo === 'SelecaoMultipla'"
  />
  <q-checkbox
    v-else-if="campo.tipo === 'Checkbox'"
    v-model="marcado"
    :label="campo.label"
  />
  <q-slider
    v-else-if="campo.tipo === 'Escala'"
    v-model="numero"
    :min="campo.min ?? 0"
    :max="campo.max ?? 10"
    label
  />
</template>
