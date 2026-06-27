<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { pacienteService } from '@/services/paciente.service';
import { unidadeService } from '@/services/unidade.service';
import type { Paciente } from '@/types/entidades/paciente';
import { formatarCpf, formatarDataNascimento } from '@/types/entidades/paciente';
import type { Unidade } from '@/types/entidades/unidade';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const pacientes = ref<Paciente[]>([]);
const unidades = ref<Unidade[]>([]);
const unidadesPorId = ref<Map<string, string>>(new Map());
const carregando = ref(true);
const incluirInativos = ref(false);
const filtroUnidadeId = ref<string | null>(null);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const pacienteSelecionado = ref<Paciente | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'unidade', label: 'Unidade', field: 'unidade', align: 'left' as const },
  { name: 'cpf', label: 'CPF', field: 'cpf', align: 'left' as const },
  { name: 'telefone', label: 'Telefone', field: 'telefone', align: 'left' as const },
  { name: 'dataNascimento', label: 'Nascimento', field: 'dataNascimento', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

const opcoesUnidadesFiltro = ref<{ label: string; value: string | null }[]>([
  { label: 'Todas as unidades', value: null },
]);

function formatarTelefone(telefone: string | null): string {
  return telefone || '—';
}

function obterNomeUnidade(unidadeId: string): string {
  return unidadesPorId.value.get(unidadeId) ?? '—';
}

async function carregarUnidades(): Promise<void> {
  try {
    unidades.value = await unidadeService.listar(true);
    unidadesPorId.value = new Map(unidades.value.map((unidade) => [unidade.id, unidade.nome]));
    opcoesUnidadesFiltro.value = [
      { label: 'Todas as unidades', value: null },
      ...unidades.value.map((unidade) => ({
        label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
        value: unidade.id,
      })),
    ];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarPacientes(): Promise<void> {
  carregando.value = true;

  try {
    pacientes.value = await pacienteService.listar({
      unidadeId: filtroUnidadeId.value ?? undefined,
      includeInactive: incluirInativos.value,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogDesativar(paciente: Paciente): void {
  pacienteSelecionado.value = paciente;
  dialogDesativar.value = true;
}

function abrirDialogReativar(paciente: Paciente): void {
  pacienteSelecionado.value = paciente;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!pacienteSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await pacienteService.desativar(pacienteSelecionado.value.id);
    notificacao.sucesso('Paciente desativado com sucesso.');
    dialogDesativar.value = false;
    pacienteSelecionado.value = null;
    await carregarPacientes();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!pacienteSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await pacienteService.reativar(pacienteSelecionado.value.id);
    notificacao.sucesso('Paciente reativado com sucesso.');
    dialogReativar.value = false;
    pacienteSelecionado.value = null;
    await carregarPacientes();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarPaciente(id: string): void {
  router.push({ name: 'pacientes-editar', params: { id } });
}

onMounted(async () => {
  await carregarUnidades();
  await carregarPacientes();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Pacientes"
      subtitulo="Cadastre e gerencie os pacientes da clínica."
    >
      <q-btn
        color="primary"
        label="Novo paciente"
        icon="person_add"
        unelevated
        no-caps
        :disable="!isAdmin"
        :to="isAdmin ? { name: 'pacientes-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-6">
            <q-select
              v-model="filtroUnidadeId"
              :options="opcoesUnidadesFiltro"
              label="Filtrar por unidade"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="carregarPacientes"
            />
          </div>
          <div class="col-12 col-md-6">
            <q-toggle
              v-model="incluirInativos"
              label="Incluir inativos"
              color="primary"
              @update:model-value="carregarPacientes"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="pacientes.length > 0"
        :rows="pacientes"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-unidade="props">
          <q-td :props="props">
            {{ obterNomeUnidade(props.row.unidadeId) }}
          </q-td>
        </template>

        <template #body-cell-cpf="props">
          <q-td :props="props">
            {{ formatarCpf(props.row.cpf) }}
          </q-td>
        </template>

        <template #body-cell-telefone="props">
          <q-td :props="props">
            {{ formatarTelefone(props.row.telefone) }}
          </q-td>
        </template>

        <template #body-cell-dataNascimento="props">
          <q-td :props="props">
            {{ formatarDataNascimento(props.row.dataNascimento) }}
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
            <app-table-action-button
              acao="editar"
              rotulo="Editar paciente"
              :disable="!isAdmin"
              @click="editarPaciente(cell.row.id)"
            />
            <app-table-action-button
              v-if="cell.row.ativo"
              acao="desativar"
              rotulo="Desativar paciente"
              :disable="!isAdmin"
              @click="abrirDialogDesativar(cell.row)"
            />
            <app-table-action-button
              v-else
              acao="reativar"
              rotulo="Reativar paciente"
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
          icon="personal_injury"
          titulo="Nenhum paciente cadastrado"
          texto="Cadastre o primeiro paciente da clínica para começar."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo paciente"
            icon="person_add"
            unelevated
            no-caps
            :disable="!isAdmin"
            :to="isAdmin ? { name: 'pacientes-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar paciente</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ pacienteSelecionado?.nome }}</strong>?
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
          <div class="text-h6">Reativar paciente</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ pacienteSelecionado?.nome }}</strong>?
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
