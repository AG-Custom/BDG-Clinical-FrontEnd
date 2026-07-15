<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { pacoteService } from '@/services/pacote.service';
import type { Pacote } from '@/types/entidades/pacote';
import { formatarValorPacote } from '@/types/entidades/pacote';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.pacotes.criar);
const podeEditar = usePermissao(permissoes.pacotes.editar);
const podeDesativar = usePermissao(permissoes.pacotes.desativar);

const pacotes = ref<Pacote[]>([]);
const carregando = ref(true);
const incluirInativos = ref(false);
const dialogVisualizar = ref(false);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const pacoteSelecionado = ref<Pacote | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'valor', label: 'Valor', field: 'valor', align: 'right' as const },
  {
    name: 'itens',
    label: 'Itens',
    field: 'itens',
    align: 'center' as const,
  },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

async function carregarPacotes(): Promise<void> {
  carregando.value = true;

  try {
    pacotes.value = await pacoteService.listar({
      includeInactive: incluirInativos.value,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogVisualizar(pacote: Pacote): void {
  pacoteSelecionado.value = pacote;
  dialogVisualizar.value = true;
}

function abrirDialogDesativar(pacote: Pacote): void {
  pacoteSelecionado.value = pacote;
  dialogDesativar.value = true;
}

function abrirDialogReativar(pacote: Pacote): void {
  pacoteSelecionado.value = pacote;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!pacoteSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await pacoteService.desativar(pacoteSelecionado.value.id);
    notificacao.sucesso('Pacote desativado com sucesso.');
    dialogDesativar.value = false;
    pacoteSelecionado.value = null;
    await carregarPacotes();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!pacoteSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await pacoteService.reativar(pacoteSelecionado.value.id);
    notificacao.sucesso('Pacote reativado com sucesso.');
    dialogReativar.value = false;
    pacoteSelecionado.value = null;
    await carregarPacotes();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarPacote(id: string): void {
  router.push({ name: 'pacotes-editar', params: { id } });
}

onMounted(() => {
  void carregarPacotes();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Pacotes"
      subtitulo="Cadastre pacotes comercializados com aplicações e produtos inclusos."
    >
      <q-btn
        color="primary"
        label="Novo pacote"
        icon="add"
        unelevated
        no-caps
        :disable="!podeCriar"
        :to="podeCriar ? { name: 'pacotes-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-toggle
          v-model="incluirInativos"
          label="Incluir inativos"
          color="primary"
          @update:model-value="carregarPacotes"
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="pacotes.length > 0"
        :rows="pacotes"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-valor="props">
          <q-td :props="props">
            {{ formatarValorPacote(props.row.valor) }}
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

        <template #body-cell-acoes="cell">
          <app-table-actions-cell :cell="cell">
            <app-table-actions-menu
              :ativo="cell.row.ativo"
              :pode-editar="podeEditar"
              :pode-alterar-status="podeDesativar"
              @visualizar="abrirDialogVisualizar(cell.row)"
              @editar="editarPacote(cell.row.id)"
              @desabilitar="abrirDialogDesativar(cell.row)"
              @ativar="abrirDialogReativar(cell.row)"
            />
          </app-table-actions-cell>
        </template>
      </q-table>

      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="colunas.length" />
      </q-card-section>

      <q-card-section v-else>
        <app-empty-state
          icon="inventory"
          titulo="Nenhum pacote cadastrado"
          texto="Cadastre pacotes comerciais com saldo de produtos para os pacientes."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo pacote"
            icon="add"
            unelevated
            no-caps
            :disable="!podeCriar"
            :to="podeCriar ? { name: 'pacotes-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <app-entity-details-dialog
      v-model="dialogVisualizar"
      titulo="Detalhar pacote"
      :registro="pacoteSelecionado"
    />

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar pacote</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ pacoteSelecionado?.nome }}</strong>?
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
          <div class="text-h6">Reativar pacote</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ pacoteSelecionado?.nome }}</strong>?
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
