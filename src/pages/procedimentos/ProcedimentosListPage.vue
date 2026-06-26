<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { procedimentoService } from '@/services/procedimento.service';
import type { Procedimento } from '@/types/entidades/procedimento';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const procedimentos = ref<Procedimento[]>([]);
const carregando = ref(true);
const incluirInativos = ref(false);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const procedimentoSelecionado = ref<Procedimento | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  {
    name: 'produtoAplicado',
    label: 'Produto aplicado',
    field: 'produtoAplicadoNome',
    align: 'left' as const,
  },
  {
    name: 'itens',
    label: 'Insumos',
    field: 'itens',
    align: 'center' as const,
  },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

async function carregarProcedimentos(): Promise<void> {
  carregando.value = true;

  try {
    procedimentos.value = await procedimentoService.listar({
      includeInactive: incluirInativos.value,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogDesativar(procedimento: Procedimento): void {
  procedimentoSelecionado.value = procedimento;
  dialogDesativar.value = true;
}

function abrirDialogReativar(procedimento: Procedimento): void {
  procedimentoSelecionado.value = procedimento;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!procedimentoSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await procedimentoService.desativar(procedimentoSelecionado.value.id);
    notificacao.sucesso('Procedimento desativado com sucesso.');
    dialogDesativar.value = false;
    procedimentoSelecionado.value = null;
    await carregarProcedimentos();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!procedimentoSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await procedimentoService.reativar(procedimentoSelecionado.value.id);
    notificacao.sucesso('Procedimento reativado com sucesso.');
    dialogReativar.value = false;
    procedimentoSelecionado.value = null;
    await carregarProcedimentos();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarProcedimento(id: string): void {
  router.push({ name: 'procedimentos-editar', params: { id } });
}

onMounted(() => {
  void carregarProcedimentos();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Procedimentos"
      subtitulo="Kits reutilizáveis de insumos para aplicações em pacientes."
    >
      <q-btn
        color="primary"
        label="Novo procedimento"
        icon="add"
        unelevated
        no-caps
        :disable="!isAdmin"
        :to="isAdmin ? { name: 'procedimentos-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-toggle
          v-model="incluirInativos"
          label="Incluir inativos"
          color="primary"
          @update:model-value="carregarProcedimentos"
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="procedimentos.length > 0"
        :rows="procedimentos"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-produtoAplicado="props">
          <q-td :props="props">
            {{ props.row.produtoAplicadoNome || '—' }}
          </q-td>
        </template>

        <template #body-cell-itens="props">
          <q-td :props="props">
            {{ props.row.itens?.length ?? 0 }}
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.ativo ? 'positive' : 'grey'"
              :label="props.row.ativo ? 'Ativo' : 'Inativo'"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              aria-label="Editar procedimento"
              :disable="!isAdmin"
              @click="editarProcedimento(props.row.id)"
            />
            <q-btn
              v-if="props.row.ativo"
              flat
              round
              dense
              icon="block"
              color="negative"
              aria-label="Desativar procedimento"
              :disable="!isAdmin"
              @click="abrirDialogDesativar(props.row)"
            />
            <q-btn
              v-else
              flat
              round
              dense
              icon="restore"
              color="positive"
              aria-label="Reativar procedimento"
              :disable="!isAdmin"
              @click="abrirDialogReativar(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="medical_services"
          titulo="Nenhum procedimento cadastrado"
          texto="Cadastre kits de insumos para agilizar o registro de aplicações em pacientes."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo procedimento"
            icon="add"
            unelevated
            no-caps
            :disable="!isAdmin"
            :to="isAdmin ? { name: 'procedimentos-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar procedimento</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ procedimentoSelecionado?.nome }}</strong>?
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
          <div class="text-h6">Reativar procedimento</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ procedimentoSelecionado?.nome }}</strong>?
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
