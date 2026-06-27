<script setup lang="ts">
defineProps<{
  cell: Record<string, unknown>;
}>();
</script>

<template>
  <q-td :props="cell" class="app-table-actions-cell">
    <slot />
  </q-td>
</template>

<style scoped lang="scss">
.app-table-actions-cell {
  white-space: nowrap;
}
</style>
