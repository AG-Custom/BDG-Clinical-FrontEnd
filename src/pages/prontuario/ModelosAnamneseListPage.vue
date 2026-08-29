<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { prontuarioService } from '@/services/prontuario.service';
import type { AnamneseTemplate } from '@/types/entidades/prontuario';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeGerenciar = usePermissao(permissoes.prontuario.gerenciarModelos);

const itens = ref<AnamneseTemplate[]>([]);
const carregando = ref(true);
const incluirInativos = ref(false);
const desativando = ref(false);
const dialogDesativar = ref(false);
const modeloSelecionado = ref<AnamneseTemplate | null>(null);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const },
  { name: 'especialidade', label: 'Especialidade', field: 'especialidade', align: 'left' as const },
  { name: 'campos', label: 'Campos', field: 'campos', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: '', field: 'acoes', align: 'right' as const },
];

async function carregar(): Promise<void> {
  carregando.value = true;
  try {
    itens.value = await prontuarioService.listarModelosAnamnese(incluirInativos.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

onMounted(() => {
  void carregar();
});

function abrirDesativar(modelo: AnamneseTemplate): void {
  modeloSelecionado.value = modelo;
  dialogDesativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!modeloSelecionado.value) {
    return;
  }

  desativando.value = true;
  try {
    await prontuarioService.desativarModeloAnamnese(modeloSelecionado.value.id);
    dialogDesativar.value = false;
    notificacao.sucesso('Modelo desativado.');
    await carregar();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header titulo="Modelos de anamnese" subtitulo="Questionários reutilizáveis da clínica">
      <q-btn
        v-if="podeGerenciar"
        unelevated
        color="primary"
        icon="add"
        label="Novo modelo"
        no-caps
        :to="{ name: 'modelos-anamnese-novo' }"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-toggle v-model="incluirInativos" label="Incluir inativos" @update:model-value="carregar" />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="itens.length > 0"
        :rows="itens"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        hide-pagination
        :pagination="{ rowsPerPage: 0 }"
      >
        <template #body-cell-campos="props">
          <q-td :props="props">{{ props.row.campos.length }}</q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="props.row.ativo ? 'positive' : 'grey'" :label="props.row.ativo ? 'Ativo' : 'Inativo'" />
          </q-td>
        </template>
        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn
              flat
              color="primary"
              no-caps
              label="Editar"
              @click="router.push({ name: 'modelos-anamnese-editar', params: { id: props.row.id } })"
            />
            <q-btn
              v-if="props.row.ativo"
              flat
              color="negative"
              no-caps
              label="Desativar"
              @click="abrirDesativar(props.row)"
            />
          </q-td>
        </template>
      </q-table>
      <q-card-section v-else-if="carregando">
        <app-table-skeleton :columns="4" />
      </q-card-section>
      <q-card-section v-else>
        <app-empty-state icon="assignment" titulo="Nenhum modelo" texto="Crie o primeiro modelo de anamnese da clínica." />
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent transition-show="none" transition-hide="none">
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar modelo</div>
        </q-card-section>
        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ modeloSelecionado?.nome }}</strong>?
          Atendimentos já preenchidos continuam com o schema congelado.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" no-caps v-close-popup />
          <q-btn
            flat
            label="Desativar"
            color="negative"
            no-caps
            :disable="desativando"
            @click="confirmarDesativar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
