<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import {
  REDIRECIONAMENTO_APLICACAO,
  TEXTOS_AGENDAMENTO,
} from '@/constants/agendamentos';
import { agendamentoService } from '@/services/agendamento.service';
import type { Agendamento } from '@/types/entidades/agendamento';

const props = defineProps<{
  modelValue: boolean;
  agendamento: Agendamento | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
  concluido: [];
}>();

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const processando = ref(false);
const textos = TEXTOS_AGENDAMENTO.decisaoAplicacao;
const textoComum = TEXTOS_AGENDAMENTO.comum;

function fechar(): void {
  emit('update:modelValue', false);
}

async function irParaAplicacao(): Promise<void> {
  const agendamento = props.agendamento;
  if (!agendamento) return;

  processando.value = true;
  try {
    await agendamentoService.concluir(agendamento.id, { registrarAplicacao: false });
    notificacao.sucesso(textos.concluidoComRedirecionamento);
    fechar();
    emit('concluido');
    await router.push({
      name: REDIRECIONAMENTO_APLICACAO.rotaNovaAplicacao,
      query: {
        pacienteId: agendamento.pacienteId,
        unidadeId: agendamento.unidadeId,
        aplicadorId: agendamento.funcionarioId,
        dataAplicacao: agendamento.dataInicio,
      },
    });
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    processando.value = false;
  }
}

async function concluirSemAplicacao(): Promise<void> {
  const agendamento = props.agendamento;
  if (!agendamento) return;

  processando.value = true;
  try {
    await agendamentoService.concluir(agendamento.id, { registrarAplicacao: false });
    notificacao.sucesso(textos.concluidoSemAplicacao);
    fechar();
    emit('concluido');
  } catch (erro) {
    notificacao.erro(obterMensagem(erro));
  } finally {
    processando.value = false;
  }
}
</script>

<template>
  <q-dialog
    :model-value="modelValue && Boolean(agendamento)"
    persistent
    @update:model-value="!$event && fechar()"
  >
    <q-card class="decisao-aplicacao">
      <q-card-section class="decisao-aplicacao__cabecalho">
        <div class="row items-start no-wrap">
          <q-avatar color="primary" text-color="white" icon="vaccines" size="52px" />
          <div class="col q-ml-md">
            <div class="text-h6">{{ textos.titulo }}</div>
            <div class="text-body2 text-grey-7 q-mt-xs">
              {{ textos.descricaoInicio }} <strong>{{ agendamento?.pacienteNome }}</strong>.
              {{ textos.descricaoFim }}
            </div>
          </div>
          <q-btn
            flat
            round
            dense
            icon="close"
            :aria-label="textoComum.fechar"
            :disable="processando"
            @click="fechar"
          />
        </div>
      </q-card-section>

      <q-card-actions align="right" class="decisao-aplicacao__acoes">
        <q-btn
          flat
          :label="textos.concluirSemAplicacao"
          color="positive"
          icon="task_alt"
          no-caps
          :loading="processando"
          @click="concluirSemAplicacao"
        />
        <q-btn
          unelevated
          :label="textos.irParaAplicacao"
          color="primary"
          icon-right="arrow_forward"
          no-caps
          :loading="processando"
          @click="irParaAplicacao"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.decisao-aplicacao {
  max-width: 92vw;
  width: 580px;

  &__cabecalho {
    padding: var(--ds-space-5, 24px);
  }

  &__acoes {
    gap: var(--ds-space-2, 8px);
    padding: 0 var(--ds-space-5, 24px) var(--ds-space-5, 24px);
  }
}

@media (max-width: 599px) {
  .decisao-aplicacao__acoes {
    align-items: stretch;
    flex-direction: column-reverse;

    :deep(.q-btn) {
      width: 100%;
    }
  }
}
</style>
