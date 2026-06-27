<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import HorarioFuncionamentoUnidadePanel from '@/components/unidades/HorarioFuncionamentoUnidadePanel.vue';
import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { horarioFuncionamentoUnidadeService } from '@/services/horario-funcionamento-unidade.service';
import { unidadeService } from '@/services/unidade.service';
import type { CriarHorarioFuncionamentoRequest } from '@/types/entidades/horario-funcionamento-unidade';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);
const horarioPanelRef = ref<InstanceType<typeof HorarioFuncionamentoUnidadePanel> | null>(null);
const horariosPendentes = ref<CriarHorarioFuncionamentoRequest[]>([]);

const isEdicao = computed(() => route.name === 'unidades-editar');
const unidadeId = computed(() => route.params.id as string | undefined);

const form = reactive({
  nome: '',
  endereco: '',
});

function aoAtualizarPendentes(pendentes: CriarHorarioFuncionamentoRequest[]): void {
  horariosPendentes.value = pendentes;
}

async function carregarUnidade(): Promise<void> {
  if (!isEdicao.value || !unidadeId.value) {
    return;
  }

  carregando.value = true;

  try {
    const unidade = await unidadeService.obter(unidadeId.value);
    form.nome = unidade.nome;
    form.endereco = unidade.endereco;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'unidades' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    if (isEdicao.value && unidadeId.value) {
      await unidadeService.atualizar(unidadeId.value, {
        nome: form.nome,
        endereco: form.endereco,
      });
      notificacao.sucesso('Unidade atualizada com sucesso.');
    } else {
      const unidade = await unidadeService.criar({
        nome: form.nome,
        endereco: form.endereco,
      });

      const pendentes = horarioPanelRef.value?.obterPendentes() ?? horariosPendentes.value;
      await horarioFuncionamentoUnidadeService.criarEmLote(unidade.id, pendentes);

      if (pendentes.length > 0) {
        notificacao.sucesso(
          `Unidade cadastrada com ${pendentes.length} horário${pendentes.length === 1 ? '' : 's'}.`,
        );
      } else {
        notificacao.sucesso('Unidade cadastrada com sucesso.');
      }
    }

    await router.push({ name: 'unidades' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'unidades' });
}

onMounted(() => {
  void carregarUnidade();
});
</script>

<template>
  <q-page class="page-content page-content--form-wide q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar unidade' : 'Nova unidade'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados e o horário de funcionamento da unidade.'
          : 'Cadastre uma nova unidade da clínica.'
      "
    />

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome"
            outlined
            :readonly="!isAdmin"
            :rules="[(value: string) => Boolean(value) || 'Informe o nome da unidade']"
          />

          <q-input
            v-model="form.endereco"
            class="form-field--required"
            label="Endereço"
            outlined
            type="textarea"
            autogrow
            :readonly="!isAdmin"
            :rules="[(value: string) => Boolean(value) || 'Informe o endereço']"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!isAdmin"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <horario-funcionamento-unidade-panel
          ref="horarioPanelRef"
          :unidade-id="isEdicao ? unidadeId : null"
          :desabilitado="!isAdmin || salvando"
          :texto-ajuda="
            isEdicao
              ? 'Gerencie os dias e horários em que a unidade aceita agendamentos.'
              : 'Opcional na criação. Os horários serão salvos junto com a unidade.'
          "
          @update:pendentes="aoAtualizarPendentes"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>
