<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';

const props = withDefaults(
  defineProps<{
    mensagem: string;
    rotuloAcao: string;
    destino: RouteLocationRaw;
    inline?: boolean;
  }>(),
  {
    inline: false,
  },
);

const emit = defineEmits<{
  atualizar: [];
}>();

const router = useRouter();

const urlDestino = computed(() => router.resolve(props.destino).href);
</script>

<template>
  <div
    class="form-dependencia-alerta"
    :class="{ 'form-dependencia-alerta--inline': inline }"
  >
    <div class="form-dependencia-alerta__conteudo">
      <q-icon
        v-if="!inline"
        name="info"
        color="primary"
        size="20px"
        class="form-dependencia-alerta__icone"
      />
      <div class="form-dependencia-alerta__texto">
        <p class="form-dependencia-alerta__mensagem">{{ mensagem }}</p>
        <div class="form-dependencia-alerta__acoes">
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            label="Atualizar lista"
            @click="emit('atualizar')"
          />
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            :label="rotuloAcao"
            icon-right="open_in_new"
            tag="a"
            :href="urlDestino"
            target="_blank"
            rel="noopener noreferrer"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.form-dependencia-alerta {
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-subtle);

  &--inline {
    padding: var(--ds-space-2) 0 0;
    border: none;
    border-radius: 0;
    background: transparent;
  }

  &__conteudo {
    display: flex;
    align-items: flex-start;
    gap: var(--ds-space-3);
  }

  &--inline &__conteudo {
    gap: 0;
  }

  &__icone {
    flex-shrink: 0;
    margin-top: var(--ds-space-1);
  }

  &__texto {
    flex: 1;
    min-width: 0;
  }

  &__mensagem {
    margin: 0;
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
    line-height: var(--ds-line-height-normal);
  }

  &__acoes {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ds-space-1);
    margin-top: var(--ds-space-2);
  }
}
</style>
