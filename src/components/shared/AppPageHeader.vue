<script setup lang="ts">
defineProps<{
  titulo: string;
  subtitulo?: string;
}>();
</script>

<template>
  <header class="page-header">
    <div>
      <div v-if="$slots.contexto" class="page-header__contexto">
        <slot name="contexto" />
      </div>
      <h1>{{ titulo }}</h1>
      <p v-if="subtitulo">{{ subtitulo }}</p>
    </div>
    <slot />
  </header>
</template>
