<script setup lang="ts">
import { computed, reactive } from 'vue';

import type { DiaSemana } from '@/types/entidades/horario-funcionamento-unidade';
import {
  DIAS_FIM_DE_SEMANA,
  DIAS_SEMANA,
  DIAS_UTEIS,
  obterLabelDiaSemana,
} from '@/types/entidades/horario-funcionamento-unidade';

const props = withDefaults(
  defineProps<{
    modoEdicao?: boolean;
    diaUnico?: DiaSemana;
    desabilitado?: boolean;
  }>(),
  {
    modoEdicao: false,
    diaUnico: undefined,
    desabilitado: false,
  },
);

const form = reactive({
  diasSelecionados: [] as DiaSemana[],
  horaInicio: '08:00',
  horaFim: '18:00',
});

const LABEL_DIA_CURTO: Record<DiaSemana, string> = {
  Domingo: 'Dom',
  Segunda: 'Seg',
  Terca: 'Ter',
  Quarta: 'Qua',
  Quinta: 'Qui',
  Sexta: 'Sex',
  Sabado: 'Sáb',
};

const opcoesDias = computed(() =>
  DIAS_SEMANA.map((dia) => ({
    label: obterLabelDiaSemana(dia),
    value: dia,
  })),
);

const todosDiasSelecionados = computed(
  () => form.diasSelecionados.length === DIAS_SEMANA.length,
);

const diasUteisSelecionados = computed(
  () =>
    DIAS_UTEIS.length === form.diasSelecionados.length &&
    DIAS_UTEIS.every((dia) => form.diasSelecionados.includes(dia)),
);

function selecionarTodosDias(): void {
  form.diasSelecionados = [...DIAS_SEMANA];
}

function selecionarDiasUteis(): void {
  form.diasSelecionados = [...DIAS_UTEIS];
}

function selecionarFimDeSemana(): void {
  form.diasSelecionados = [...DIAS_FIM_DE_SEMANA];
}

function limparDias(): void {
  form.diasSelecionados = [];
}

function alternarDia(dia: DiaSemana): void {
  if (props.desabilitado || props.modoEdicao) {
    return;
  }

  if (form.diasSelecionados.includes(dia)) {
    form.diasSelecionados = form.diasSelecionados.filter((item) => item !== dia);
    return;
  }

  form.diasSelecionados = [...form.diasSelecionados, dia];
}

function obterFaixa() {
  return {
    diasSemana: props.modoEdicao && props.diaUnico ? [props.diaUnico] : [...form.diasSelecionados],
    horaInicio: form.horaInicio,
    horaFim: form.horaFim,
  };
}

function preencher(faixa: { diasSemana: DiaSemana[]; horaInicio: string; horaFim: string }): void {
  form.diasSelecionados = [...faixa.diasSemana];
  form.horaInicio = faixa.horaInicio;
  form.horaFim = faixa.horaFim;
}

function reiniciar(): void {
  form.diasSelecionados = props.modoEdicao && props.diaUnico ? [props.diaUnico] : [...DIAS_UTEIS];
  form.horaInicio = '08:00';
  form.horaFim = '18:00';
}

if (!props.modoEdicao) {
  reiniciar();
}

defineExpose({
  obterFaixa,
  preencher,
  reiniciar,
});
</script>

<template>
  <div class="horario-faixa-fields">
    <div v-if="!modoEdicao" class="horario-faixa-fields__presets">
      <q-btn
        flat
        dense
        no-caps
        color="primary"
        label="Todos os dias"
        :disable="desabilitado"
        class="horario-faixa-fields__preset"
        :class="{ 'horario-faixa-fields__preset--ativo': todosDiasSelecionados }"
        @click="selecionarTodosDias"
      />
      <q-btn
        flat
        dense
        no-caps
        color="primary"
        label="Segunda a Sexta"
        :disable="desabilitado"
        class="horario-faixa-fields__preset"
        :class="{ 'horario-faixa-fields__preset--ativo': diasUteisSelecionados }"
        @click="selecionarDiasUteis"
      />
      <q-btn
        flat
        dense
        no-caps
        color="primary"
        label="Fim de semana"
        :disable="desabilitado"
        class="horario-faixa-fields__preset"
        @click="selecionarFimDeSemana"
      />
      <q-btn
        flat
        dense
        no-caps
        color="primary"
        label="Limpar"
        :disable="desabilitado"
        class="horario-faixa-fields__preset"
        @click="limparDias"
      />
    </div>

    <q-select
      v-if="modoEdicao"
      :model-value="diaUnico"
      :options="opcoesDias"
      label="Dia da semana *"
      outlined
      dense
      emit-value
      map-options
      disable
    />

    <div v-else class="horario-faixa-fields__dias">
      <button
        v-for="dia in DIAS_SEMANA"
        :key="dia"
        type="button"
        class="horario-faixa-fields__dia"
        :class="{ 'horario-faixa-fields__dia--ativo': form.diasSelecionados.includes(dia) }"
        :disabled="desabilitado"
        @click="alternarDia(dia)"
      >
        {{ LABEL_DIA_CURTO[dia] }}
      </button>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6">
        <q-input
          v-model="form.horaInicio"
          type="time"
          label="Início *"
          outlined
          dense
          :disable="desabilitado"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-input
          v-model="form.horaFim"
          type="time"
          label="Fim *"
          outlined
          dense
          :disable="desabilitado"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.horario-faixa-fields {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);

  &__presets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-space-1);
  }

  &__preset {
    border-radius: 999px;
    min-height: 28px;
    transition: none;

    &--ativo {
      background: var(--ds-bg-subtle);
      font-weight: var(--ds-font-weight-semibold);
    }
  }

  &__dias {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-space-2);
  }

  &__dia {
    background: var(--ds-bg-page);
    border: 1px solid var(--ds-border-default);
    border-radius: 999px;
    color: var(--ds-text-secondary);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--ds-font-size-sm, 0.875rem);
    font-weight: var(--ds-font-weight-medium);
    min-width: 44px;
    padding: var(--ds-space-1) var(--ds-space-3);
    transition: none;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    &--ativo {
      background: var(--ds-brand-primary);
      border-color: var(--ds-brand-primary);
      color: var(--ds-text-inverse);
    }
  }
}
</style>
