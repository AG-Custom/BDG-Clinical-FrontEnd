<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AjustarSaldoCompraDialog from '@/components/compras/AjustarSaldoCompraDialog.vue';
import AppEntityAuditSection from '@/components/shared/AppEntityAuditSection.vue';
import { permissoes } from '@/constants/permissoes';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { compraPacienteService } from '@/services/compra-paciente.service';
import type {
  CompraPaciente,
  HistoricoCompraPacienteEvento,
} from '@/types/entidades/compra-paciente';
import {
  formatarDataCompra,
  formatarTextoHistoricoCompra,
  obterCorStatusCompra,
  obterLabelStatusCompra,
  podeAjustarSaldoCompra,
} from '@/types/entidades/compra-paciente';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeEditar = usePermissao(permissoes.comprasPaciente.editar);

const compraId = computed(() => route.params.id as string);
const compra = ref<CompraPaciente | null>(null);
const eventos = ref<HistoricoCompraPacienteEvento[]>([]);
const carregando = ref(true);
const dialogAjustarSaldo = ref(false);
let requestSeq = 0;

const podeAjustar = computed(
  () =>
    Boolean(compra.value) &&
    podeEditar.value &&
    podeAjustarSaldoCompra(compra.value!.status),
);

function iconeEvento(tipo: string): string {
  switch (tipo) {
    case 'Compra':
      return 'shopping_bag';
    case 'Aplicacao':
      return 'vaccines';
    case 'CancelamentoAplicacao':
      return 'undo';
    case 'AjusteManual':
      return 'tune';
    case 'CancelamentoCompra':
      return 'cancel';
    default:
      return 'history';
  }
}

function voltar(): void {
  const from = route.query.from;
  const pacienteId = route.query.pacienteId;

  if (from === 'paciente' && typeof pacienteId === 'string' && pacienteId.trim()) {
    void router.push({ name: 'pacientes-compras', params: { id: pacienteId } });
    return;
  }

  void router.push({ name: 'compras' });
}

async function carregarDetalhe(): Promise<void> {
  const id = compraId.value;
  if (!id) {
    return;
  }

  const seq = ++requestSeq;
  carregando.value = true;

  try {
    const [compraCarregada, historico] = await Promise.all([
      compraPacienteService.obter(id),
      compraPacienteService.obterHistorico(id),
    ]);

    if (seq !== requestSeq) {
      return;
    }

    compra.value = compraCarregada;
    eventos.value = historico.eventos ?? [];
  } catch (error) {
    if (seq !== requestSeq) {
      return;
    }

    notificacao.erro(obterMensagem(error));
    compra.value = null;
    eventos.value = [];
    voltar();
  } finally {
    if (seq === requestSeq) {
      carregando.value = false;
    }
  }
}

function abrirAjustarSaldo(): void {
  dialogAjustarSaldo.value = true;
}

async function aoSalvarAjusteSaldo(): Promise<void> {
  await carregarDetalhe();
}

watch(compraId, () => {
  void carregarDetalhe();
});

onMounted(() => {
  void carregarDetalhe();
});

onUnmounted(() => {
  requestSeq += 1;
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      :titulo="compra?.pacoteNome || 'Detalhes da compra'"
      :subtitulo="
        compra
          ? `${compra.pacienteNome} · ${formatarDataCompra(compra.dataCompra)}`
          : 'Saldo atual e histórico de movimentações da compra.'
      "
    >
      <q-btn flat label="Voltar" color="primary" no-caps @click="voltar" />
      <q-btn
        v-if="podeAjustar"
        color="primary"
        label="Ajustar saldo"
        icon="tune"
        outline
        no-caps
        @click="abrirAjustarSaldo"
      />
    </app-page-header>

    <div v-if="carregando && !compra" class="q-pa-md text-body2 text-secondary">
      Carregando detalhes…
    </div>

    <div v-else-if="compra" class="compra-detalhe-page">
      <q-card flat bordered class="compra-detalhe-page__card">
        <q-card-section class="compra-detalhe-page__header">
          <div class="compra-detalhe-page__titulo-wrap">
            <div class="text-h6">Dados da compra</div>
            <q-badge
              :color="obterCorStatusCompra(compra.status)"
              :label="obterLabelStatusCompra(compra.status)"
            />
          </div>
        </q-card-section>

        <q-card-section>
          <div class="compra-detalhe-page__grid">
            <div class="compra-detalhe-page__campo">
              <span>Paciente</span>
              <strong>{{ compra.pacienteNome }}</strong>
            </div>
            <div class="compra-detalhe-page__campo">
              <span>Unidade</span>
              <strong>{{ compra.unidadeNome }}</strong>
            </div>
            <div class="compra-detalhe-page__campo">
              <span>Data da compra</span>
              <strong>{{ formatarDataCompra(compra.dataCompra) }}</strong>
            </div>
            <div class="compra-detalhe-page__campo">
              <span>Pacote</span>
              <strong>{{ compra.pacoteNome }}</strong>
            </div>
            <div
              v-if="compra.observacao"
              class="compra-detalhe-page__campo compra-detalhe-page__campo--full"
            >
              <span>Observação</span>
              <strong>{{ compra.observacao }}</strong>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="compra-detalhe-page__card">
        <q-card-section>
          <div class="text-h6 q-mb-md">Saldo atual</div>
          <q-markup-table
            v-if="compra.saldo?.produtos?.length"
            flat
            bordered
            dense
          >
            <thead>
              <tr>
                <th class="text-left">Produto</th>
                <th class="text-right">Contratado</th>
                <th class="text-right">Utilizado</th>
                <th class="text-right">Restante</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="produto in compra.saldo.produtos"
                :key="produto.produtoId"
              >
                <td>{{ produto.produtoNome }}</td>
                <td class="text-right">
                  {{ produto.quantidadeContratada }} {{ produto.unidadeMedida }}
                </td>
                <td class="text-right">
                  {{ produto.quantidadeUtilizada }} {{ produto.unidadeMedida }}
                </td>
                <td class="text-right">
                  {{ produto.quantidadeRestante }} {{ produto.unidadeMedida }}
                </td>
              </tr>
            </tbody>
          </q-markup-table>
          <p v-else class="compra-detalhe-page__vazio">Sem produtos de saldo.</p>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="compra-detalhe-page__card">
        <q-card-section>
          <div class="text-h6 q-mb-md">
            Histórico
            <span v-if="carregando" class="compra-detalhe-page__carregando">· carregando…</span>
          </div>

          <div v-if="eventos.length" class="compra-detalhe-page__timeline">
            <div
              v-for="(evento, index) in eventos"
              :key="`${evento.tipo}-${evento.data}-${index}`"
              class="compra-detalhe-page__evento"
            >
              <div class="compra-detalhe-page__evento-icone">
                <q-icon :name="iconeEvento(evento.tipo)" size="18px" />
              </div>
              <div class="compra-detalhe-page__evento-texto">
                {{ formatarTextoHistoricoCompra(evento) }}
              </div>
            </div>
          </div>
          <p v-else class="compra-detalhe-page__vazio">Nenhuma movimentação registrada.</p>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="compra-detalhe-page__card">
        <q-card-section>
          <app-entity-audit-section
            :ativo="true"
            :registro-id="compra.id"
            entidade-auditoria="CompraPaciente"
            :criado-em="compra.criadoEm"
            :atualizado-em="compra.atualizadoEm"
            mostrar-titulo-secao
          />
        </q-card-section>
      </q-card>
    </div>

    <ajustar-saldo-compra-dialog
      v-model="dialogAjustarSaldo"
      :compra="compra"
      @salvo="aoSalvarAjusteSaldo"
    />
  </q-page>
</template>

<style scoped lang="scss">
.compra-detalhe-page {
  display: grid;
  gap: var(--ds-space-4);
}

.compra-detalhe-page__card {
  background: var(--ds-bg-surface);
}

.compra-detalhe-page__header {
  border-bottom: 1px solid var(--ds-border-default);
}

.compra-detalhe-page__titulo-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2);
}

.compra-detalhe-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ds-space-3) var(--ds-space-4);
}

.compra-detalhe-page__campo {
  display: grid;
  gap: var(--ds-space-1);
  min-width: 0;

  &--full {
    grid-column: 1 / -1;
  }

  span {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
    font-weight: var(--ds-font-weight-medium);
  }

  strong {
    color: var(--ds-text-primary);
    font-size: 0.95rem;
    font-weight: var(--ds-font-weight-medium);
    overflow-wrap: anywhere;
  }
}

.compra-detalhe-page__timeline {
  display: grid;
  gap: var(--ds-space-2);
}

.compra-detalhe-page__evento {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: var(--ds-space-3);
  align-items: start;
  padding: var(--ds-space-3);
  border-radius: var(--ds-radius-md);
  border: 1px solid var(--ds-border-default);
  background: var(--ds-bg-page);
}

.compra-detalhe-page__evento-icone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--ds-radius-md);
  color: var(--ds-brand-primary);
  background: var(--ds-bg-surface);
  border: 1px solid var(--ds-border-default);
}

.compra-detalhe-page__evento-texto {
  color: var(--ds-text-primary);
  font-size: var(--ds-font-size-sm);
  line-height: var(--ds-line-height-normal);
  overflow-wrap: anywhere;
}

.compra-detalhe-page__vazio {
  margin: 0;
  color: var(--ds-text-secondary);
  font-size: 0.95rem;
}

.compra-detalhe-page__carregando {
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
  font-weight: var(--ds-font-weight-medium);
}

.text-secondary {
  color: var(--ds-text-secondary);
}

@media (max-width: 600px) {
  .compra-detalhe-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
