<script setup lang="ts">
import { computed } from 'vue';

import { obterConfigAcaoTabela, type AcaoTabelaPreset } from '@/constants/table-actions';

const props = withDefaults(
  defineProps<{
    acao: AcaoTabelaPreset;
    rotulo?: string;
    disable?: boolean;
    loading?: boolean;
  }>(),
  {
    rotulo: undefined,
    disable: false,
    loading: false,
  },
);

const emit = defineEmits<{
  click: [];
}>();

const config = computed(() => obterConfigAcaoTabela(props.acao));
const textoTooltip = computed(() => props.rotulo ?? config.value.rotuloPadrao);
</script>

<template>
  <q-btn
    flat
    round
    dense
    :icon="config.icone"
    :color="config.cor"
    :aria-label="textoTooltip"
    :disable="disable"
    :loading="loading"
    @click="emit('click')"
  >
    <q-tooltip>{{ textoTooltip }}</q-tooltip>
  </q-btn>
</template>
