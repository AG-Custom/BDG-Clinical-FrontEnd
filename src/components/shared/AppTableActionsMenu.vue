<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    ativo?: boolean;
    podeVisualizar?: boolean;
    podeEditar?: boolean;
    podeAlterarStatus?: boolean;
    mostrarVisualizar?: boolean;
    mostrarEditar?: boolean;
    mostrarStatus?: boolean;
    desabilitarLabel?: string;
    ativarLabel?: string;
  }>(),
  {
    ativo: true,
    podeVisualizar: true,
    podeEditar: true,
    podeAlterarStatus: true,
    mostrarVisualizar: true,
    mostrarEditar: true,
    mostrarStatus: true,
    desabilitarLabel: 'Desabilitar',
    ativarLabel: 'Ativar',
  },
);

const emit = defineEmits<{
  visualizar: [];
  editar: [];
  desabilitar: [];
  ativar: [];
}>();

const statusLabel = computed(() => (props.ativo ? props.desabilitarLabel : props.ativarLabel));
const statusIcon = computed(() => (props.ativo ? 'delete' : 'check_circle'));
const statusClass = computed(() => (props.ativo ? 'table-actions-menu__icon--danger' : 'table-actions-menu__icon--success'));
</script>

<template>
  <q-btn
    class="table-actions-menu__button"
    label="Ações"
    icon-right="keyboard_arrow_down"
    unelevated
    no-caps
    :aria-label="'Abrir ações'"
  >
    <q-menu
      class="table-actions-menu"
      anchor="bottom right"
      self="top right"
      :offset="[0, 8]"
    >
      <q-list class="table-actions-menu__list">
        <q-item
          v-if="mostrarVisualizar"
          clickable
          v-close-popup
          :disable="!podeVisualizar"
          @click="emit('visualizar')"
        >
          <q-item-section avatar>
            <span class="table-actions-menu__icon table-actions-menu__icon--view">
              <q-icon name="visibility" />
            </span>
          </q-item-section>
          <q-item-section>Visualizar</q-item-section>
        </q-item>

        <q-item
          v-if="mostrarEditar"
          clickable
          v-close-popup
          :disable="!podeEditar"
          @click="emit('editar')"
        >
          <q-item-section avatar>
            <span class="table-actions-menu__icon table-actions-menu__icon--edit">
              <q-icon name="edit" />
            </span>
          </q-item-section>
          <q-item-section>Editar</q-item-section>
        </q-item>

        <q-item
          v-if="mostrarStatus"
          clickable
          v-close-popup
          :disable="!podeAlterarStatus"
          @click="ativo ? emit('desabilitar') : emit('ativar')"
        >
          <q-item-section avatar>
            <span class="table-actions-menu__icon" :class="statusClass">
              <q-icon :name="statusIcon" />
            </span>
          </q-item-section>
          <q-item-section>{{ statusLabel }}</q-item-section>
        </q-item>

        <slot />
      </q-list>
    </q-menu>
  </q-btn>
</template>

<style scoped lang="scss">
.table-actions-menu__button {
  min-width: 116px;
  border-radius: 999px;
  background: #f5f5f5;
  color: #1f2933;
  font-weight: 700;
}

.table-actions-menu__list {
  min-width: 168px;
  padding: 8px 0;
}

.table-actions-menu__icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 18px;
}

.table-actions-menu__icon--view {
  background: #dff5ee;
  color: #008766;
}

.table-actions-menu__icon--edit {
  background: #dff5ee;
  color: #008766;
}

.table-actions-menu__icon--success {
  background: #fff3d8;
  color: #13a35b;
}

.table-actions-menu__icon--danger {
  background: #fde2e7;
  color: #ef3d4f;
}
</style>
