<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import HorarioFuncionamentoUnidadePanel from '@/components/unidades/HorarioFuncionamentoUnidadePanel.vue';
import { useAdmin } from '@/composables/useAdmin';
import { unidadeService } from '@/services/unidade.service';
import type { Unidade } from '@/types/entidades/unidade';

const route = useRoute();
const router = useRouter();
const { isAdmin } = useAdmin();

const unidadeId = computed(() => route.params.id as string);
const unidade = ref<Unidade | null>(null);

async function carregarUnidade(): Promise<void> {
  unidade.value = await unidadeService.obter(unidadeId.value);
}

function voltar(): void {
  router.push({ name: 'unidades' });
}

onMounted(() => {
  void carregarUnidade();
});
</script>

<template>
  <q-page class="page-content page-content--form-wide q-pa-md">
    <app-page-header
      titulo="Horário de funcionamento"
      :subtitulo="unidade ? unidade.nome : 'Carregando unidade…'"
    >
      <q-btn flat label="Voltar" icon="arrow_back" color="primary" no-caps @click="voltar" />
    </app-page-header>

    <horario-funcionamento-unidade-panel
      :unidade-id="unidadeId"
      :desabilitado="!isAdmin"
      ocultar-cabecalho
    />
  </q-page>
</template>
