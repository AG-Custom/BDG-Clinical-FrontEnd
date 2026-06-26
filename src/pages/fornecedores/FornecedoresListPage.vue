<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { isRequisicaoCancelada, useBuscaRemota } from '@/composables/useBuscaRemota';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { fornecedorService } from '@/services/fornecedor.service';
import type { Fornecedor } from '@/types/entidades/fornecedor';
import { formatarCnpj } from '@/types/entidades/fornecedor';

const LIMITE_BUSCA = 20;
const MIN_CARACTERES_BUSCA = 2;

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const fornecedores = ref<Fornecedor[]>([]);
const carregando = ref(true);
const incluirInativos = ref(false);
const termoBusca = ref('');
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const fornecedorSelecionado = ref<Fornecedor | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'cnpj', label: 'CNPJ', field: 'cnpj', align: 'left' as const },
  { name: 'telefone', label: 'Telefone', field: 'telefone', align: 'left' as const },
  { name: 'email', label: 'E-mail', field: 'email', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

function formatarTelefone(telefone: string | null): string {
  return telefone || '—';
}

function formatarEmail(email: string | null): string {
  return email || '—';
}

async function buscarFornecedores(termo: string, signal?: AbortSignal): Promise<void> {
  const termoNormalizado = termo.trim();
  const usarBusca = termoNormalizado.length >= MIN_CARACTERES_BUSCA;

  fornecedores.value = await fornecedorService.listar({
    includeInactive: incluirInativos.value,
    search: usarBusca ? termoNormalizado : undefined,
    limit: usarBusca ? LIMITE_BUSCA : undefined,
    signal,
  });
}

async function carregarFornecedores(): Promise<void> {
  carregando.value = true;

  try {
    await buscarFornecedores(termoBusca.value);
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
      await buscarFornecedores(termo, signal);
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

function abrirDialogDesativar(fornecedor: Fornecedor): void {
  fornecedorSelecionado.value = fornecedor;
  dialogDesativar.value = true;
}

function abrirDialogReativar(fornecedor: Fornecedor): void {
  fornecedorSelecionado.value = fornecedor;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!fornecedorSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await fornecedorService.desativar(fornecedorSelecionado.value.id);
    notificacao.sucesso('Fornecedor desativado com sucesso.');
    dialogDesativar.value = false;
    fornecedorSelecionado.value = null;
    await carregarFornecedores();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!fornecedorSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await fornecedorService.reativar(fornecedorSelecionado.value.id);
    notificacao.sucesso('Fornecedor reativado com sucesso.');
    dialogReativar.value = false;
    fornecedorSelecionado.value = null;
    await carregarFornecedores();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarFornecedor(id: string): void {
  router.push({ name: 'fornecedores-editar', params: { id } });
}

onMounted(() => {
  void carregarFornecedores();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Fornecedores"
      subtitulo="Cadastre fornecedores para pedidos de compra."
    >
      <q-btn
        color="primary"
        label="Novo fornecedor"
        icon="add"
        unelevated
        no-caps
        :disable="!isAdmin"
        :to="isAdmin ? { name: 'fornecedores-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-6">
            <q-input
              v-model="termoBusca"
              label="Buscar por nome ou CNPJ"
              outlined
              dense
              clearable
              :loading="carregando"
              hint="Digite ao menos 2 caracteres"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-6">
            <q-toggle
              v-model="incluirInativos"
              label="Incluir inativos"
              color="primary"
              @update:model-value="carregarFornecedores"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="fornecedores.length > 0"
        :rows="fornecedores"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-cnpj="props">
          <q-td :props="props">
            {{ formatarCnpj(props.row.cnpj) }}
          </q-td>
        </template>

        <template #body-cell-telefone="props">
          <q-td :props="props">
            {{ formatarTelefone(props.row.telefone) }}
          </q-td>
        </template>

        <template #body-cell-email="props">
          <q-td :props="props">
            {{ formatarEmail(props.row.email) }}
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
              aria-label="Editar fornecedor"
              :disable="!isAdmin"
              @click="editarFornecedor(props.row.id)"
            />
            <q-btn
              v-if="props.row.ativo"
              flat
              round
              dense
              icon="block"
              color="negative"
              aria-label="Desativar fornecedor"
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
              aria-label="Reativar fornecedor"
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
          icon="local_shipping"
          titulo="Nenhum fornecedor cadastrado"
          texto="Cadastre fornecedores para registrar pedidos de compra."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo fornecedor"
            icon="add"
            unelevated
            no-caps
            :disable="!isAdmin"
            :to="isAdmin ? { name: 'fornecedores-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar fornecedor</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ fornecedorSelecionado?.nome }}</strong>?
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
          <div class="text-h6">Reativar fornecedor</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ fornecedorSelecionado?.nome }}</strong>?
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
