<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { compraPacienteService } from '@/services/compra-paciente.service';
import { pacienteService } from '@/services/paciente.service';
import type { CompraPaciente, StatusCompraPaciente } from '@/types/entidades/compra-paciente';
import {
  STATUS_COMPRA_PACIENTE,
  formatarDataCompra,
  formatarResumoSaldoProdutos,
  isCompraAtiva,
  obterCorNivelSaldo,
  obterCorStatusCompra,
  obterLabelNivelSaldo,
  obterLabelStatusCompra,
  obterNivelSaldoCompra,
} from '@/types/entidades/compra-paciente';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.comprasPaciente.criar);
const podeCancelar = usePermissao(permissoes.comprasPaciente.cancelar);

const pacienteId = computed(() => route.params.id as string);
const pacienteNome = ref('');
const compras = ref<CompraPaciente[]>([]);
const carregando = ref(true);
const filtroStatus = ref<StatusCompraPaciente | null>(null);
const dialogVisualizar = ref(false);
const dialogCancelar = ref(false);
const compraSelecionada = ref<CompraPaciente | null>(null);
const cancelando = ref(false);
const observacaoCancelamento = ref('');

const colunas = [
  { name: 'pacote', label: 'Pacote', field: 'pacoteNome', align: 'left' as const, sortable: true },
  { name: 'unidade', label: 'Unidade', field: 'unidadeNome', align: 'left' as const },
  { name: 'dataCompra', label: 'Data da compra', field: 'dataCompra', align: 'left' as const },
  { name: 'saldo', label: 'Saldo do pacote', field: 'saldo', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'status', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const opcoesStatusFiltro = [
  { label: 'Todos os status', value: null },
  ...STATUS_COMPRA_PACIENTE.map((status) => ({
    label: obterLabelStatusCompra(status),
    value: status,
  })),
];

async function carregarPaciente(): Promise<void> {
  try {
    const paciente = await pacienteService.obter(pacienteId.value);
    pacienteNome.value = paciente.nome;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'pacientes' });
  }
}

async function carregarCompras(): Promise<void> {
  carregando.value = true;

  try {
    compras.value = await compraPacienteService.listarPorPaciente(pacienteId.value, {
      status: filtroStatus.value ?? undefined,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogVisualizar(compra: CompraPaciente): void {
  compraSelecionada.value = compra;
  dialogVisualizar.value = true;
}

function abrirDialogCancelar(compra: CompraPaciente): void {
  compraSelecionada.value = compra;
  observacaoCancelamento.value = '';
  dialogCancelar.value = true;
}

async function confirmarCancelar(): Promise<void> {
  if (!compraSelecionada.value) {
    return;
  }

  cancelando.value = true;

  try {
    await compraPacienteService.cancelar(compraSelecionada.value.id, {
      observacao: observacaoCancelamento.value.trim() || null,
    });
    notificacao.sucesso('Compra cancelada com sucesso.');
    dialogCancelar.value = false;
    compraSelecionada.value = null;
    await carregarCompras();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    cancelando.value = false;
  }
}

function novaCompra(): void {
  router.push({ name: 'pacientes-compras-nova', params: { id: pacienteId.value } });
}

function voltar(): void {
  router.push({ name: 'pacientes-editar', params: { id: pacienteId.value } });
}

onMounted(async () => {
  await carregarPaciente();
  await carregarCompras();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Compras do paciente"
      :subtitulo="
        pacienteNome
          ? `Pacotes adquiridos por ${pacienteNome}.`
          : 'Gerencie as compras de pacotes do paciente.'
      "
    >
      <q-btn flat label="Voltar" color="primary" no-caps @click="voltar" />
      <q-btn
        color="primary"
        label="Nova compra"
        icon="add"
        unelevated
        no-caps
        :disable="!podeCriar"
        @click="novaCompra"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-select
          v-model="filtroStatus"
          :options="opcoesStatusFiltro"
          label="Filtrar por status"
          outlined
          dense
          emit-value
          map-options
          style="max-width: 280px"
          @update:model-value="carregarCompras"
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="compras.length > 0"
        :rows="compras"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-dataCompra="props">
          <q-td :props="props">
            {{ formatarDataCompra(props.row.dataCompra) }}
          </q-td>
        </template>

        <template #body-cell-saldo="props">
          <q-td :props="props">
            <q-badge
              :color="obterCorNivelSaldo(obterNivelSaldoCompra(props.row.saldo))"
              :label="obterLabelNivelSaldo(obterNivelSaldoCompra(props.row.saldo))"
            />
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="obterCorStatusCompra(props.row.status)"
              :label="obterLabelStatusCompra(props.row.status)"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <q-btn
              class="table-actions-menu__button"
              label="Ações"
              icon-right="keyboard_arrow_down"
              unelevated
              no-caps
            >
              <q-menu anchor="bottom right" self="top right" :offset="[0, 8]">
                <q-list style="min-width: 168px">
                  <q-item clickable v-close-popup @click="abrirDialogVisualizar(cell.row)">
                    <q-item-section avatar>
                      <q-icon name="visibility" color="primary" />
                    </q-item-section>
                    <q-item-section>Visualizar</q-item-section>
                  </q-item>
                  <q-item
                    v-if="isCompraAtiva(cell.row.status)"
                    clickable
                    v-close-popup
                    :disable="!podeCancelar"
                    @click="abrirDialogCancelar(cell.row)"
                  >
                    <q-item-section avatar>
                      <q-icon name="cancel" color="negative" />
                    </q-item-section>
                    <q-item-section>Cancelar compra</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </app-table-actions-cell>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="shopping_bag"
          titulo="Nenhuma compra registrada"
          texto="Registre a compra de um pacote para este paciente."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Nova compra"
            icon="add"
            unelevated
            no-caps
            :disable="!podeCriar"
            @click="novaCompra"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogVisualizar">
      <q-card style="min-width: 360px; max-width: 560px">
        <q-card-section>
          <div class="text-h6">Detalhes da compra</div>
        </q-card-section>

        <q-card-section v-if="compraSelecionada" class="q-gutter-sm">
          <div><strong>Pacote:</strong> {{ compraSelecionada.pacoteNome }}</div>
          <div><strong>Unidade:</strong> {{ compraSelecionada.unidadeNome }}</div>
          <div>
            <strong>Data:</strong> {{ formatarDataCompra(compraSelecionada.dataCompra) }}
          </div>
          <div>
            <strong>Status:</strong>
            {{ obterLabelStatusCompra(compraSelecionada.status) }}
          </div>
          <div>
            <strong>Saldo do pacote:</strong>
            {{ formatarResumoSaldoProdutos(compraSelecionada.saldo) }}
          </div>
          <div v-if="compraSelecionada.observacao">
            <strong>Observação:</strong> {{ compraSelecionada.observacao }}
          </div>

          <div
            v-if="compraSelecionada.saldo?.produtos?.length"
            class="q-mt-md"
          >
            <div class="text-subtitle2 q-mb-sm">Produtos</div>
            <q-markup-table flat bordered dense>
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
                  v-for="produto in compraSelecionada.saldo.produtos"
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
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Fechar" color="primary" no-caps v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogCancelar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Cancelar compra</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja cancelar a compra do pacote
          <strong>{{ compraSelecionada?.pacoteNome }}</strong>?
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="observacaoCancelamento"
            label="Observação (opcional)"
            outlined
            type="textarea"
            autogrow
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Voltar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Cancelar compra"
            color="negative"
            no-caps
            :loading="cancelando"
            @click="confirmarCancelar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
.table-actions-menu__button {
  min-width: 116px;
  border-radius: 999px;
  background: #f5f5f5;
  color: #1f2933;
  font-weight: 700;
}
</style>
