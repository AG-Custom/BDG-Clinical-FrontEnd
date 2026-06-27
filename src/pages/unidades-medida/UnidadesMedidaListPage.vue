<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { isRequisicaoCancelada, useBuscaRemota } from '@/composables/useBuscaRemota';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { unidadeMedidaService } from '@/services/unidade-medida.service';
import {
  TIPOS_UNIDADE_MEDIDA,
  type TipoUnidadeMedida,
  type UnidadeMedida,
} from '@/types/entidades/unidade-medida';

const LIMITE_BUSCA = 20;
const MIN_CARACTERES_BUSCA = 2;

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const unidadesMedida = ref<UnidadeMedida[]>([]);
const carregando = ref(true);
const incluirInativas = ref(false);
const filtroTipo = ref<TipoUnidadeMedida | null>(null);
const termoBusca = ref('');
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const unidadeSelecionada = ref<UnidadeMedida | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'sigla', label: 'Sigla', field: 'sigla', align: 'left' as const, sortable: true },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const opcoesTiposFiltro = [
  { label: 'Todos os tipos', value: null },
  ...TIPOS_UNIDADE_MEDIDA.map((tipo) => ({ label: tipo, value: tipo })),
];

async function buscarUnidadesMedida(termo: string, signal?: AbortSignal): Promise<void> {
  const termoNormalizado = termo.trim();
  const usarBusca = termoNormalizado.length >= MIN_CARACTERES_BUSCA;

  unidadesMedida.value = await unidadeMedidaService.listar({
    tipo: filtroTipo.value ?? undefined,
    includeInactive: incluirInativas.value,
    search: usarBusca ? termoNormalizado : undefined,
    limit: usarBusca ? LIMITE_BUSCA : undefined,
    signal,
  });
}

async function carregarUnidadesMedida(): Promise<void> {
  carregando.value = true;

  try {
    await buscarUnidadesMedida(termoBusca.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

useBuscaRemota(
  termoBusca,
  async (termo, signal) => {
    carregando.value = true;

    try {
      await buscarUnidadesMedida(termo, signal);
    } catch (error) {
      if (!isRequisicaoCancelada(error)) {
        notificacao.erro(obterMensagem(error));
      }
    } finally {
      carregando.value = false;
    }
  },
  { minCaracteres: MIN_CARACTERES_BUSCA, debounceMs: 300 },
);

function abrirDialogDesativar(unidade: UnidadeMedida): void {
  unidadeSelecionada.value = unidade;
  dialogDesativar.value = true;
}

function abrirDialogReativar(unidade: UnidadeMedida): void {
  unidadeSelecionada.value = unidade;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!unidadeSelecionada.value) {
    return;
  }

  desativando.value = true;

  try {
    await unidadeMedidaService.desativar(unidadeSelecionada.value.id);
    notificacao.sucesso('Unidade de medida desativada com sucesso.');
    dialogDesativar.value = false;
    unidadeSelecionada.value = null;
    await carregarUnidadesMedida();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!unidadeSelecionada.value) {
    return;
  }

  reativando.value = true;

  try {
    await unidadeMedidaService.reativar(unidadeSelecionada.value.id);
    notificacao.sucesso('Unidade de medida reativada com sucesso.');
    dialogReativar.value = false;
    unidadeSelecionada.value = null;
    await carregarUnidadesMedida();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarUnidade(id: string): void {
  router.push({ name: 'unidades-medida-editar', params: { id } });
}

onMounted(() => {
  void carregarUnidadesMedida();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Unidades de medida"
      subtitulo="Gerencie as unidades utilizadas no cadastro de produtos."
    >
      <q-btn
        color="primary"
        label="Nova unidade"
        icon="add"
        unelevated
        no-caps
        :disable="!isAdmin"
        :to="isAdmin ? { name: 'unidades-medida-nova' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-4">
            <q-input
              v-model="termoBusca"
              label="Buscar por nome ou sigla"
              outlined
              dense
              clearable
              :loading="carregando"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroTipo"
              :options="opcoesTiposFiltro"
              label="Filtrar por tipo"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarUnidadesMedida"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-toggle
              v-model="incluirInativas"
              label="Incluir inativas"
              color="primary"
              @update:model-value="carregarUnidadesMedida"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="unidadesMedida.length > 0"
        :rows="unidadesMedida"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.ativo ? 'positive' : 'grey'"
              :label="props.row.ativo ? 'Ativa' : 'Inativa'"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-action-button
              acao="editar"
              rotulo="Editar unidade de medida"
              :disable="!isAdmin"
              @click="editarUnidade(cell.row.id)"
            />
            <app-table-action-button
              v-if="cell.row.ativo"
              acao="desativar"
              rotulo="Desativar unidade de medida"
              :disable="!isAdmin"
              @click="abrirDialogDesativar(cell.row)"
            />
            <app-table-action-button
              v-else
              acao="reativar"
              rotulo="Reativar unidade de medida"
              :disable="!isAdmin"
              @click="abrirDialogReativar(cell.row)"
            />
          </app-table-actions-cell>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="straighten"
          titulo="Nenhuma unidade de medida cadastrada"
          texto="Cadastre unidades como mg, ml e un antes de registrar produtos."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Nova unidade"
            icon="add"
            unelevated
            no-caps
            :disable="!isAdmin"
            :to="isAdmin ? { name: 'unidades-medida-nova' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar unidade de medida</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ unidadeSelecionada?.nome }} ({{ unidadeSelecionada?.sigla }})</strong>?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Desativar"
            color="negative"
            no-caps
            :loading="desativando"
            @click="confirmarDesativar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogReativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Reativar unidade de medida</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ unidadeSelecionada?.nome }} ({{ unidadeSelecionada?.sigla }})</strong>?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Reativar"
            color="positive"
            no-caps
            :loading="reativando"
            @click="confirmarReativar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
