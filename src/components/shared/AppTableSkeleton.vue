<script setup lang="ts">
withDefaults(
  defineProps<{
    columns?: number;
    rows?: number;
  }>(),
  {
    columns: 4,
    rows: 6,
  },
);
</script>

<template>
  <q-markup-table flat class="app-table-skeleton">
    <thead>
      <tr>
        <th v-for="coluna in columns" :key="`cabecalho-${coluna}`" class="app-table-skeleton__cell">
          <q-skeleton type="text" width="70%" animation="none" />
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="linha in rows" :key="`linha-${linha}`">
        <td v-for="coluna in columns" :key="`celula-${linha}-${coluna}`" class="app-table-skeleton__cell">
          <q-skeleton type="text" :width="coluna === columns ? '45%' : '85%'" animation="none" />
        </td>
      </tr>
    </tbody>
  </q-markup-table>
</template>

<style scoped lang="scss">
.app-table-skeleton {
  background: transparent;

  :deep(thead tr),
  :deep(tbody tr) {
    height: auto;
  }

  :deep(th),
  :deep(td) {
    border-color: var(--ds-border-default);
  }
}

.app-table-skeleton__cell {
  padding: var(--ds-space-3) var(--ds-space-4);
}
</style>
