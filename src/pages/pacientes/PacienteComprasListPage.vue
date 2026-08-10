<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AjustarSaldoCompraDialog from '@/components/compras/AjustarSaldoCompraDialog.vue';
import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { compraPacienteService } from '@/services/compra-paciente.service';
import { pacienteService } from '@/services/paciente.service';
import type {
  CompraPaciente,
  NivelSaldoCompra,
  StatusCompraPaciente,
} from '@/types/entidades/compra-paciente';
import {
  NIVEIS_SALDO_COMPRA,
  STATUS_COMPRA_PACIENTE,
  formatarDataCompra,
  formatarDetalheQuantidadesSaldo,
  isCompraAtiva,
  obterCorNivelSaldo,
  obterCorStatusCompra,
  obterLabelNivelSaldo,
  obterLabelStatusCompra,
  obterNivelSaldoCompra,
  podeAjustarSaldoCompra,
} from '@/types/entidades/compra-paciente';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.comprasPaciente.criar);
const podeEditar = usePermissao(permissoes.comprasPaciente.editar);
const podeCancelar = usePermissao(permissoes.comprasPaciente.cancelar);

const pacienteId = computed(() => route.params.id as string);
const pacienteNome = ref('');
const compras = ref<CompraPaciente[]>([]);
const carregando = ref(true);
const filtroStatus = ref<StatusCompraPaciente | null>(null);
const filtroNivelSaldo = ref<NivelSaldoCompra | null>(null);
const dialogCancelar = ref(false);
const dialogAjustarSaldo = ref(false);
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

const opcoesNivelSaldoFiltro = [
  { label: 'Todos os saldos', value: null as NivelSaldoCompra | null },
  ...NIVEIS_SALDO_COMPRA.map((nivel) => ({
    label: obterLabelNivelSaldo(nivel),
    value: nivel as NivelSaldoCompra | null,
  })),
];

const comprasFiltradas = computed(() => {
  if (!filtroNivelSaldo.value) {
    return compras.value;
  }

  return compras.value.filter(
    (compra) => obterNivelSaldoCompra(compra.saldo) === filtroNivelSaldo.value,
  );
});

const listaVaziaPorFiltroSaldo = computed(
  () =>
    !carregando.value &&
    compras.value.length > 0 &&
    comprasFiltradas.value.length === 0 &&
    filtroNivelSaldo.value !== null,
);

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

function abrirDetalheCompra(compra: CompraPaciente): void {
  void router.push({
    name: 'compras-detalhe',
    params: { id: compra.id },
    query: { from: 'paciente', pacienteId: pacienteId.value },
  });
}

function abrirDialogCancelar(compra: CompraPaciente): void {
  compraSelecionada.value = compra;
  observacaoCancelamento.value = '';
  dialogCancelar.value = true;
}

function abrirDialogAjustarSaldo(compra: CompraPaciente): void {
  compraSelecionada.value = compra;
  dialogAjustarSaldo.value = true;
}

async function aoSalvarAjusteSaldo(): Promise<void> {
  await carregarCompras();
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
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="filtroStatus"
              :options="opcoesStatusFiltro"
              label="Filtrar por status"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarCompras"
            />
          </div>
          <div class="col-12 col-sm-6 col-md-4">
            <q-select
              v-model="filtroNivelSaldo"
              :options="opcoesNivelSaldoFiltro"
              label="Filtrar por saldo"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="comprasFiltradas.length > 0"
        :rows="comprasFiltradas"
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
            <div class="row items-center q-gutter-xs no-wrap">
              <q-badge
                :color="obterCorNivelSaldo(obterNivelSaldoCompra(props.row.saldo))"
                :label="obterLabelNivelSaldo(obterNivelSaldoCompra(props.row.saldo))"
              />
              <span
                v-if="formatarDetalheQuantidadesSaldo(props.row.saldo)"
                class="text-body2"
              >
                {{ formatarDetalheQuantidadesSaldo(props.row.saldo) }}
              </span>
            </div>
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
                  <q-item clickable v-close-popup @click="abrirDetalheCompra(cell.row)">
                    <q-item-section avatar>
                      <q-icon name="visibility" color="primary" />
                    </q-item-section>
                    <q-item-section>Visualizar</q-item-section>
                  </q-item>
                  <q-item
                    v-if="podeAjustarSaldoCompra(cell.row.status)"
                    clickable
                    v-close-popup
                    :disable="!podeEditar"
                    @click="abrirDialogAjustarSaldo(cell.row)"
                  >
                    <q-item-section avatar>
                      <q-icon name="tune" color="primary" />
                    </q-item-section>
                    <q-item-section>Ajustar saldo</q-item-section>
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
          v-if="listaVaziaPorFiltroSaldo"
          icon="inventory_2"
          titulo="Nenhuma compra com esse saldo"
          :texto="`Não há compras com saldo '${obterLabelNivelSaldo(filtroNivelSaldo!)}' para este paciente.`"
        />
        <template v-else>
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
        </template>
      </q-card-section>
    </q-card>

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

    <ajustar-saldo-compra-dialog
      v-model="dialogAjustarSaldo"
      :compra="compraSelecionada"
      @salvo="aoSalvarAjusteSaldo"
    />
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
