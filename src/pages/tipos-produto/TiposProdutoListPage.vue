<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { tipoProdutoService } from '@/services/tipo-produto.service';
import type { TipoProduto } from '@/types/entidades/tipo-produto';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.tiposProduto.criar);
const podeEditar = usePermissao(permissoes.tiposProduto.editar);
const podeDesativar = usePermissao(permissoes.tiposProduto.desativar);

const tiposProduto = ref<TipoProduto[]>([]);
const carregando = ref(true);
const incluirInativos = ref(false);
const dialogVisualizar = ref(false);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const tipoSelecionado = ref<TipoProduto | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

async function carregarTiposProduto(): Promise<void> {
  carregando.value = true;

  try {
    tiposProduto.value = await tipoProdutoService.listar(incluirInativos.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogVisualizar(tipo: TipoProduto): void {
  tipoSelecionado.value = tipo;
  dialogVisualizar.value = true;
}

function abrirDialogDesativar(tipo: TipoProduto): void {
  tipoSelecionado.value = tipo;
  dialogDesativar.value = true;
}

function abrirDialogReativar(tipo: TipoProduto): void {
  tipoSelecionado.value = tipo;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!tipoSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await tipoProdutoService.desativar(tipoSelecionado.value.id);
    notificacao.sucesso('Tipo de produto desativado com sucesso.');
    dialogDesativar.value = false;
    tipoSelecionado.value = null;
    await carregarTiposProduto();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!tipoSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await tipoProdutoService.reativar(tipoSelecionado.value.id);
    notificacao.sucesso('Tipo de produto reativado com sucesso.');
    dialogReativar.value = false;
    tipoSelecionado.value = null;
    await carregarTiposProduto();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarTipo(id: string): void {
  router.push({ name: 'tipos-produto-editar', params: { id } });
}

onMounted(() => {
  void carregarTiposProduto();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Tipos de produto"
      subtitulo="Gerencie os tipos utilizados no cadastro de produtos."
    >
      <q-btn
        color="primary"
        label="Novo tipo"
        icon="add"
        unelevated
        no-caps
        :disable="!podeCriar"
        :to="podeCriar ? { name: 'tipos-produto-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-toggle
          v-model="incluirInativos"
          label="Incluir inativos"
          color="primary"
          @update:model-value="carregarTiposProduto"
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="tiposProduto.length > 0"
        :rows="tiposProduto"
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
              @editar="editarTipo(cell.row.id)"
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
          icon="category"
          titulo="Nenhum tipo de produto cadastrado"
          texto="Cadastre os tipos antes de registrar produtos no estoque."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo tipo"
            icon="add"
            unelevated
            no-caps
            :disable="!podeCriar"
            :to="podeCriar ? { name: 'tipos-produto-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <app-entity-details-dialog
      v-model="dialogVisualizar"
      titulo="Detalhar tipo de produto"
      :registro="tipoSelecionado"
    />

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar tipo de produto</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ tipoSelecionado?.nome }}</strong>?
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
          <div class="text-h6">Reativar tipo de produto</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ tipoSelecionado?.nome }}</strong>?
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
