<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    icon: string;
    valor: string | number;
    hint?: string;
  }>(),
  {
    hint: undefined,
  },
);
</script>

<template>
  <q-card flat bordered class="metric-card">
    <q-card-section class="row items-center no-wrap q-gutter-md">
      <q-avatar color="primary" text-color="white" :icon="icon" />
      <div class="metric-card__content">
        <div class="metric-value">{{ valor }}</div>
        <div class="row items-center no-wrap metric-label-row">
          <div class="metric-label">{{ label }}</div>
          <q-icon
            v-if="hint"
            name="info_outline"
            size="18px"
            class="form-field-input-hint metric-card__hint"
          >
            <q-tooltip
              anchor="top middle"
              self="bottom middle"
              :offset="[0, 8]"
              max-width="320px"
            >
              {{ hint }}
            </q-tooltip>
          </q-icon>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>
