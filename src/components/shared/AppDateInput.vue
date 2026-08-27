<script setup lang="ts">
import type { QInputProps } from 'quasar';
import { computed, ref, watch } from 'vue';

import { TEXTOS_CAMPO_DATA } from '@/constants/datas';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    label?: string;
    comHorario?: boolean;
    outlined?: boolean;
    dense?: boolean;
    disable?: boolean;
    readonly?: boolean;
    clearable?: boolean;
    rules?: QInputProps['rules'];
  }>(),
  {
    modelValue: '',
    label: undefined,
    comHorario: false,
    outlined: true,
    dense: false,
    disable: false,
    readonly: false,
    clearable: false,
    rules: () => [],
  },
);

const emit = defineEmits<{
  'update:modelValue': [valor: string];
}>();

interface PopupProxyRef {
  hide: () => void;
}

const popupData = ref<PopupProxyRef | null>(null);
const popupHorario = ref<PopupProxyRef | null>(null);
const textoDigitado = ref('');

const mascara = computed(() =>
  props.comHorario ? '##/##/#### ##:##' : '##/##/####',
);
const placeholder = computed(() =>
  props.comHorario ? TEXTOS_CAMPO_DATA.formatoDataHora : TEXTOS_CAMPO_DATA.formatoData,
);

function dataValida(ano: number, mes: number, dia: number): boolean {
  if (ano < 1000 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

function formatarModelo(valor?: string | null): string {
  if (!valor) return '';
  const correspondencia = valor.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/,
  );
  if (!correspondencia) return '';

  const [, ano, mes, dia, hora = '00', minuto = '00'] = correspondencia;
  return props.comHorario
    ? `${dia}/${mes}/${ano} ${hora}:${minuto}`
    : `${dia}/${mes}/${ano}`;
}

function converterParaModelo(valor: string): string | null {
  const expressao = props.comHorario
    ? /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/
    : /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const correspondencia = valor.match(expressao);
  if (!correspondencia) return null;

  const [, diaTexto, mesTexto, anoTexto, horaTexto = '00', minutoTexto = '00'] = correspondencia;
  const dia = Number(diaTexto);
  const mes = Number(mesTexto);
  const ano = Number(anoTexto);
  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);

  if (!dataValida(ano, mes, dia) || hora > 23 || minuto > 59) return null;

  const data = `${anoTexto}-${mesTexto}-${diaTexto}`;
  return props.comHorario ? `${data}T${horaTexto}:${minutoTexto}` : data;
}

function atualizarTexto(valor: string | number | null): void {
  const texto = valor === null ? '' : String(valor);
  textoDigitado.value = texto;

  if (!texto) {
    emit('update:modelValue', '');
    return;
  }

  const convertido = converterParaModelo(texto);
  if (convertido) emit('update:modelValue', convertido);
}

const regrasInternas = computed<QInputProps['rules']>(() => {
  const validarFormato = (valor: unknown): true | string => {
    const texto = String(valor ?? '');
    if (!texto) return true;
    return (
      Boolean(converterParaModelo(texto)) ||
      (props.comHorario
        ? TEXTOS_CAMPO_DATA.dataHoraInvalida
        : TEXTOS_CAMPO_DATA.dataInvalida)
    );
  };

  const regrasExternas = (props.rules ?? []).map((regra) => (valor: unknown) => {
    if (typeof regra !== 'function') return true;
    const texto = String(valor ?? '');
    const convertido = texto ? converterParaModelo(texto) : '';
    return regra(convertido ?? texto, {} as never);
  });

  return [validarFormato, ...regrasExternas];
});

const dataCalendario = computed({
  get: () => {
    const convertido = converterParaModelo(textoDigitado.value) ?? props.modelValue ?? '';
    return convertido.slice(0, 10);
  },
  set: (data: string) => {
    const hora = horaCalendario.value || '00:00';
    const modelo = props.comHorario ? `${data}T${hora}` : data;
    emit('update:modelValue', modelo);
    textoDigitado.value = formatarModelo(modelo);
    popupData.value?.hide();
  },
});

const horaCalendario = computed({
  get: () => {
    const convertido = converterParaModelo(textoDigitado.value) ?? props.modelValue ?? '';
    return convertido.length >= 16 ? convertido.slice(11, 16) : '';
  },
  set: (hora: string) => {
    const data = dataCalendario.value;
    if (!data) return;
    const modelo = `${data}T${hora}`;
    emit('update:modelValue', modelo);
    textoDigitado.value = formatarModelo(modelo);
    popupHorario.value?.hide();
  },
});

watch(
  () => props.modelValue,
  (valor) => {
    const atualNormalizado = converterParaModelo(textoDigitado.value);
    if ((valor ?? '') !== (atualNormalizado ?? '')) {
      textoDigitado.value = formatarModelo(valor);
    }
  },
  { immediate: true },
);
</script>

<template>
  <q-input
    v-bind="$attrs"
    :model-value="textoDigitado"
    :label="label"
    :mask="mascara"
    :placeholder="placeholder"
    :outlined="outlined"
    :dense="dense"
    :disable="disable"
    :readonly="readonly"
    :clearable="clearable"
    :rules="regrasInternas"
    inputmode="numeric"
    @update:model-value="atualizarTexto"
  >
    <template v-if="!readonly && !disable" #append>
      <q-icon
        name="event"
        class="cursor-pointer"
        :aria-label="TEXTOS_CAMPO_DATA.abrirCalendario"
      >
        <q-popup-proxy ref="popupData" cover transition-show="scale" transition-hide="scale">
          <q-date v-model="dataCalendario" mask="YYYY-MM-DD" today-btn />
        </q-popup-proxy>
      </q-icon>
      <q-icon
        v-if="comHorario"
        name="schedule"
        class="cursor-pointer q-ml-sm"
        :aria-label="TEXTOS_CAMPO_DATA.selecionarHorario"
      >
        <q-popup-proxy ref="popupHorario" cover transition-show="scale" transition-hide="scale">
          <q-time v-model="horaCalendario" format24h now-btn />
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>
