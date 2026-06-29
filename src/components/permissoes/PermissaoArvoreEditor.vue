<script setup lang="ts">
import { computed } from 'vue';

import { agruparPorCategoria, coletarChavesFolha, useMapaPermissoes } from '@/composables/useMapaPermissoes';
import type { NoMapaPermissao } from '@/types/entidades/permissao';

type ModoEditor = 'cargo' | 'override-allow' | 'override-deny';

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    readonly?: boolean;
    modo?: ModoEditor;
  }>(),
  {
    readonly: false,
    modo: 'cargo',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const { mapa, carregando } = useMapaPermissoes();

const chavesSelecionadas = computed({
  get: () => props.modelValue,
  set: (valor: string[]) => emit('update:modelValue', valor),
});

const grupos = computed(() => {
  const folhas = coletarChavesFolha(mapa.value);
  return agruparPorCategoria(folhas);
});

const tituloModo = computed(() => {
  if (props.modo === 'override-allow') {
    return 'Permissões adicionais (Allow)';
  }

  if (props.modo === 'override-deny') {
    return 'Permissões negadas (Deny)';
  }

  return 'Permissões do cargo';
});

function estaSelecionado(chave: string): boolean {
  return chavesSelecionadas.value.includes(chave);
}

function alternarChave(chave: string): void {
  if (props.readonly) {
    return;
  }

  if (estaSelecionado(chave)) {
    chavesSelecionadas.value = chavesSelecionadas.value.filter((item) => item !== chave);
    return;
  }

  chavesSelecionadas.value = [...chavesSelecionadas.value, chave];
}

function chavesDaCategoria(nos: NoMapaPermissao[]): string[] {
  return nos.map((no) => no.key);
}

function categoriaTotalmenteSelecionada(nos: NoMapaPermissao[]): boolean {
  const chaves = chavesDaCategoria(nos);

  return chaves.length > 0 && chaves.every((chave) => estaSelecionado(chave));
}

function categoriaParcialmenteSelecionada(nos: NoMapaPermissao[]): boolean {
  const chaves = chavesDaCategoria(nos);
  const selecionadas = chaves.filter((chave) => estaSelecionado(chave));

  return selecionadas.length > 0 && selecionadas.length < chaves.length;
}

function alternarCategoria(nos: NoMapaPermissao[]): void {
  if (props.readonly) {
    return;
  }

  const chaves = chavesDaCategoria(nos);

  if (categoriaTotalmenteSelecionada(nos)) {
    chavesSelecionadas.value = chavesSelecionadas.value.filter((item) => !chaves.includes(item));
    return;
  }

  const conjunto = new Set(chavesSelecionadas.value);
  chaves.forEach((chave) => conjunto.add(chave));
  chavesSelecionadas.value = [...conjunto];
}
</script>

<template>
  <div class="permissao-arvore-editor">
    <div class="permissao-arvore-editor__titulo text-subtitle2 text-weight-medium q-mb-sm">
      {{ tituloModo }}
    </div>

    <div v-if="carregando" class="permissao-arvore-editor__carregando q-pa-md">
      Carregando permissões...
    </div>

    <div v-else-if="grupos.size === 0" class="permissao-arvore-editor__vazio q-pa-md">
      Nenhuma permissão disponível para esta empresa.
    </div>

    <div v-else class="permissao-arvore-editor__grupos">
      <q-expansion-item
        v-for="[categoria, nos] in grupos"
        :key="categoria"
        dense
        default-opened
        header-class="permissao-arvore-editor__grupo-header"
        class="permissao-arvore-editor__grupo"
      >
        <template #header>
          <q-item-section>
            <q-item-label>{{ categoria }}</q-item-label>
          </q-item-section>
          <q-item-section v-if="!readonly" side @click.stop>
            <q-checkbox
              :model-value="categoriaTotalmenteSelecionada(nos)"
              :indeterminate="categoriaParcialmenteSelecionada(nos)"
              dense
              color="primary"
              label="Todas"
              @update:model-value="alternarCategoria(nos)"
            />
          </q-item-section>
        </template>

        <q-list dense padding>
          <q-item
            v-for="no in nos"
            :key="no.key"
            clickable
            :disable="readonly"
            @click="alternarChave(no.key)"
          >
            <q-item-section side>
              <q-checkbox
                :model-value="estaSelecionado(no.key)"
                :disable="readonly"
                dense
                color="primary"
                @update:model-value="alternarChave(no.key)"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ no.description }}</q-item-label>
            </q-item-section>
            <q-item-section v-if="modo !== 'cargo'" side>
              <q-badge
                :color="modo === 'override-allow' ? 'positive' : 'negative'"
                :label="modo === 'override-allow' ? 'Allow' : 'Deny'"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-expansion-item>
    </div>
  </div>
</template>

<style scoped lang="scss">
.permissao-arvore-editor {
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-surface);
}

.permissao-arvore-editor__titulo {
  padding: var(--ds-space-3) var(--ds-space-3) 0;
  color: var(--ds-text-primary);
}

.permissao-arvore-editor__carregando,
.permissao-arvore-editor__vazio {
  color: var(--ds-text-secondary);
}

.permissao-arvore-editor__grupo-header {
  color: var(--ds-text-primary);
  font-weight: var(--ds-font-weight-medium);
}

.permissao-arvore-editor__grupos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: var(--ds-space-2);
  padding: var(--ds-space-2);
}

.permissao-arvore-editor__grupo {
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  min-width: 0;
}
</style>
