<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { cargoService } from '@/services/cargo.service';
import type { Cargo } from '@/types/entidades/cargo';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const cargos = ref<Cargo[]>([]);
const carregando = ref(false);
const incluirInativos = ref(false);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const cargoSelecionado = ref<Cargo | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

async function carregarCargos(): Promise<void> {
  carregando.value = true;

  try {
    cargos.value = await cargoService.listar(incluirInativos.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogDesativar(cargo: Cargo): void {
  cargoSelecionado.value = cargo;
  dialogDesativar.value = true;
}

function abrirDialogReativar(cargo: Cargo): void {
  cargoSelecionado.value = cargo;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!cargoSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await cargoService.desativar(cargoSelecionado.value.id);
    notificacao.sucesso('Cargo desativado com sucesso.');
    dialogDesativar.value = false;
    cargoSelecionado.value = null;
    await carregarCargos();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!cargoSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await cargoService.reativar(cargoSelecionado.value.id);
    notificacao.sucesso('Cargo reativado com sucesso.');
    dialogReativar.value = false;
    cargoSelecionado.value = null;
    await carregarCargos();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarCargo(id: string): void {
  router.push({ name: 'cargos-editar', params: { id } });
}

onMounted(() => {
  void carregarCargos();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Cargos"
      subtitulo="Gerencie os cargos dos colaboradores."
    >
      <q-btn
        color="primary"
        label="Novo cargo"
        icon="add"
        unelevated
        no-caps
        :disable="!isAdmin"
        :to="isAdmin ? { name: 'cargos-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-toggle
          v-model="incluirInativos"
          label="Incluir inativos"
          color="primary"
          @update:model-value="carregarCargos"
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="cargos.length > 0 || carregando"
        :rows="cargos"
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

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              aria-label="Editar cargo"
              :disable="!isAdmin"
              @click="editarCargo(props.row.id)"
            />
            <q-btn
              v-if="props.row.ativo"
              flat
              round
              dense
              icon="block"
              color="negative"
              aria-label="Desativar cargo"
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
              aria-label="Reativar cargo"
              :disable="!isAdmin"
              @click="abrirDialogReativar(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <q-card-section v-else-if="!carregando">
        <app-empty-state
          icon="badge"
          titulo="Nenhum cargo cadastrado"
          texto="Cadastre os cargos da sua clínica para vincular aos colaboradores."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo cargo"
            icon="add"
            unelevated
            no-caps
            :disable="!isAdmin"
            :to="isAdmin ? { name: 'cargos-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar cargo</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ cargoSelecionado?.nome }}</strong>?
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
          <div class="text-h6">Reativar cargo</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ cargoSelecionado?.nome }}</strong>?
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
