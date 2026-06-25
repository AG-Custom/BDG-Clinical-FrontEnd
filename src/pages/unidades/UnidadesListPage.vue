<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { unidadeService } from '@/services/unidade.service';
import type { Unidade } from '@/types/entidades/unidade';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const unidades = ref<Unidade[]>([]);
const carregando = ref(true);
const incluirInativas = ref(false);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const unidadeSelecionada = ref<Unidade | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'endereco', label: 'Endereço', field: 'endereco', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

async function carregarUnidades(): Promise<void> {
  carregando.value = true;

  try {
    unidades.value = await unidadeService.listar(incluirInativas.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogDesativar(unidade: Unidade): void {
  unidadeSelecionada.value = unidade;
  dialogDesativar.value = true;
}

function abrirDialogReativar(unidade: Unidade): void {
  unidadeSelecionada.value = unidade;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!unidadeSelecionada.value) {
    return;
  }

  desativando.value = true;

  try {
    await unidadeService.desativar(unidadeSelecionada.value.id);
    notificacao.sucesso('Unidade desativada com sucesso.');
    dialogDesativar.value = false;
    unidadeSelecionada.value = null;
    await carregarUnidades();
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
    await unidadeService.reativar(unidadeSelecionada.value.id);
    notificacao.sucesso('Unidade reativada com sucesso.');
    dialogReativar.value = false;
    unidadeSelecionada.value = null;
    await carregarUnidades();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarUnidade(id: string): void {
  router.push({ name: 'unidades-editar', params: { id } });
}

onMounted(() => {
  void carregarUnidades();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Unidades"
      subtitulo="Gerencie as unidades da sua clínica."
    >
      <q-btn
        color="primary"
        label="Nova unidade"
        icon="add"
        unelevated
        no-caps
        :disable="!isAdmin"
        :to="isAdmin ? { name: 'unidades-nova' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-toggle
          v-model="incluirInativas"
          label="Incluir inativas"
          color="primary"
          @update:model-value="carregarUnidades"
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="unidades.length > 0"
        :rows="unidades"
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

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              aria-label="Editar unidade"
              :disable="!isAdmin"
              @click="editarUnidade(props.row.id)"
            />
            <q-btn
              v-if="props.row.ativo"
              flat
              round
              dense
              icon="block"
              color="negative"
              aria-label="Desativar unidade"
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
              aria-label="Reativar unidade"
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
          icon="apartment"
          titulo="Nenhuma unidade cadastrada"
          texto="Cadastre a primeira unidade da sua clínica para começar."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Nova unidade"
            icon="add"
            unelevated
            no-caps
            :disable="!isAdmin"
            :to="isAdmin ? { name: 'unidades-nova' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar unidade</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ unidadeSelecionada?.nome }}</strong>?
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
          <div class="text-h6">Reativar unidade</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ unidadeSelecionada?.nome }}</strong>?
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
