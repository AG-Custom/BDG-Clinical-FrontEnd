<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { sintomaService } from '@/services/sintoma.service';
import type { Sintoma } from '@/types/entidades/sintoma';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const sintomas = ref<Sintoma[]>([]);
const carregando = ref(true);
const incluirInativos = ref(false);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const sintomaSelecionado = ref<Sintoma | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

async function carregarSintomas(): Promise<void> {
  carregando.value = true;

  try {
    sintomas.value = await sintomaService.listar(incluirInativos.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogDesativar(sintoma: Sintoma): void {
  sintomaSelecionado.value = sintoma;
  dialogDesativar.value = true;
}

function abrirDialogReativar(sintoma: Sintoma): void {
  sintomaSelecionado.value = sintoma;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!sintomaSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await sintomaService.desativar(sintomaSelecionado.value.id);
    notificacao.sucesso('Sintoma desativado com sucesso.');
    dialogDesativar.value = false;
    sintomaSelecionado.value = null;
    await carregarSintomas();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!sintomaSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await sintomaService.reativar(sintomaSelecionado.value.id);
    notificacao.sucesso('Sintoma reativado com sucesso.');
    dialogReativar.value = false;
    sintomaSelecionado.value = null;
    await carregarSintomas();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarSintoma(id: string): void {
  router.push({ name: 'sintomas-editar', params: { id } });
}

onMounted(() => {
  void carregarSintomas();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Sintomas"
      subtitulo="Gerencie os sintomas registrados em aplicações."
    >
      <q-btn
        color="primary"
        label="Novo sintoma"
        icon="add"
        unelevated
        no-caps
        :disable="!isAdmin"
        :to="isAdmin ? { name: 'sintomas-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-toggle
          v-model="incluirInativos"
          label="Incluir inativos"
          color="primary"
          @update:model-value="carregarSintomas"
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="sintomas.length > 0"
        :rows="sintomas"
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
            <app-table-action-button
              acao="editar"
              rotulo="Editar sintoma"
              :disable="!isAdmin"
              @click="editarSintoma(cell.row.id)"
            />
            <app-table-action-button
              v-if="cell.row.ativo"
              acao="desativar"
              rotulo="Desativar sintoma"
              :disable="!isAdmin"
              @click="abrirDialogDesativar(cell.row)"
            />
            <app-table-action-button
              v-else
              acao="reativar"
              rotulo="Reativar sintoma"
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
          icon="healing"
          titulo="Nenhum sintoma cadastrado"
          texto="Cadastre sintomas para registrar em aplicações realizadas nos pacientes."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo sintoma"
            icon="add"
            unelevated
            no-caps
            :disable="!isAdmin"
            :to="isAdmin ? { name: 'sintomas-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar sintoma</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ sintomaSelecionado?.nome }}</strong>?
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
          <div class="text-h6">Reativar sintoma</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ sintomaSelecionado?.nome }}</strong>?
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
