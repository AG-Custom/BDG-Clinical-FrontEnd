<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { funcionarioService } from '@/services/funcionario.service';
import { cargoService } from '@/services/cargo.service';
import { unidadeService } from '@/services/unidade.service';
import type { Funcionario } from '@/types/entidades/funcionario';
import {
  obterNomeCargoVinculo,
  obterNomesUnidadesVinculo,
  obterVinculoLabel,
} from '@/types/entidades/funcionario';

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const funcionarios = ref<Funcionario[]>([]);
const unidadesPorId = ref<Map<string, string>>(new Map());
const cargosPorId = ref<Map<string, string>>(new Map());
const carregando = ref(true);
const incluirInativos = ref(false);
const dialogDesativar = ref(false);
const dialogReativar = ref(false);
const funcionarioSelecionado = ref<Funcionario | null>(null);
const desativando = ref(false);
const reativando = ref(false);

const colunas = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'cargo', label: 'Cargo', field: 'cargo', align: 'left' as const },
  {
    name: 'emailLogin',
    label: 'E-mail de login',
    field: 'emailLogin',
    align: 'left' as const,
  },
  { name: 'telefone', label: 'Telefone', field: 'telefone', align: 'left' as const },
  { name: 'vinculo', label: 'Vínculo', field: 'vinculo', align: 'left' as const },
  { name: 'acesso', label: 'Acesso', field: 'acesso', align: 'center' as const },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

function formatarTelefone(telefone: string | null): string {
  return telefone || '—';
}

function obterTooltipVinculo(funcionario: Funcionario): string | null {
  const nomes = obterNomesUnidadesVinculo(funcionario, unidadesPorId.value);

  if (nomes.length === 0) {
    return null;
  }

  return nomes.join('\n');
}

function possuiTooltipVinculo(funcionario: Funcionario): boolean {
  return obterTooltipVinculo(funcionario) !== null;
}

async function carregarUnidades(): Promise<void> {
  try {
    const unidades = await unidadeService.listar(true);
    unidadesPorId.value = new Map(unidades.map((unidade) => [unidade.id, unidade.nome]));
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarCargos(): Promise<void> {
  try {
    const cargos = await cargoService.listar(true);
    cargosPorId.value = new Map(cargos.map((cargo) => [cargo.id, cargo.nome]));
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarFuncionarios(): Promise<void> {
  carregando.value = true;

  try {
    funcionarios.value = await funcionarioService.listar({
      includeInactive: incluirInativos.value,
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirDialogDesativar(funcionario: Funcionario): void {
  funcionarioSelecionado.value = funcionario;
  dialogDesativar.value = true;
}

function abrirDialogReativar(funcionario: Funcionario): void {
  funcionarioSelecionado.value = funcionario;
  dialogReativar.value = true;
}

async function confirmarDesativar(): Promise<void> {
  if (!funcionarioSelecionado.value) {
    return;
  }

  desativando.value = true;

  try {
    await funcionarioService.desativar(funcionarioSelecionado.value.id);
    notificacao.sucesso('Funcionário desativado com sucesso.');
    dialogDesativar.value = false;
    funcionarioSelecionado.value = null;
    await carregarFuncionarios();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    desativando.value = false;
  }
}

async function confirmarReativar(): Promise<void> {
  if (!funcionarioSelecionado.value) {
    return;
  }

  reativando.value = true;

  try {
    await funcionarioService.reativar(funcionarioSelecionado.value.id);
    notificacao.sucesso('Funcionário reativado com sucesso.');
    dialogReativar.value = false;
    funcionarioSelecionado.value = null;
    await carregarFuncionarios();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    reativando.value = false;
  }
}

function editarFuncionario(id: string): void {
  router.push({ name: 'funcionarios-editar', params: { id } });
}

onMounted(async () => {
  await Promise.all([carregarUnidades(), carregarCargos()]);
  await carregarFuncionarios();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Funcionários"
      subtitulo="Cadastre colaboradores com acesso à plataforma."
    >
      <q-btn
        color="primary"
        label="Novo funcionário"
        icon="person_add"
        unelevated
        no-caps
        :disable="!isAdmin"
        :to="isAdmin ? { name: 'funcionarios-novo' } : undefined"
      />
    </app-page-header>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-toggle
          v-model="incluirInativos"
          label="Incluir inativos"
          color="primary"
          @update:model-value="carregarFuncionarios"
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        v-if="funcionarios.length > 0"
        :rows="funcionarios"
        :columns="colunas"
        row-key="id"
        flat
        :loading="carregando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-cargo="props">
          <q-td :props="props">
            {{ obterNomeCargoVinculo(props.row, cargosPorId) }}
          </q-td>
        </template>

        <template #body-cell-telefone="props">
          <q-td :props="props">
            {{ formatarTelefone(props.row.telefone) }}
          </q-td>
        </template>

        <template #body-cell-vinculo="props">
          <q-td :props="props">
            <span
              v-if="possuiTooltipVinculo(props.row)"
              class="funcionarios-list__vinculo-tooltip"
            >
              {{ obterVinculoLabel(props.row) }}
              <q-tooltip anchor="top middle" self="bottom middle">
                <span class="funcionarios-list__vinculo-tooltip-text">
                  {{ obterTooltipVinculo(props.row) }}
                </span>
              </q-tooltip>
            </span>
            <span v-else>{{ obterVinculoLabel(props.row) }}</span>
          </q-td>
        </template>

        <template #body-cell-acesso="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.pendentePrimeiroAcesso"
              color="warning"
              label="Pendente 1º acesso"
            />
            <q-badge v-else color="positive" label="Ativo" />
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
              rotulo="Editar funcionário"
              :disable="!isAdmin"
              @click="editarFuncionario(cell.row.id)"
            />
            <app-table-action-button
              v-if="cell.row.ativo"
              acao="desativar"
              rotulo="Desativar funcionário"
              :disable="!isAdmin"
              @click="abrirDialogDesativar(cell.row)"
            />
            <app-table-action-button
              v-else
              acao="reativar"
              rotulo="Reativar funcionário"
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
          icon="groups"
          titulo="Nenhum funcionário cadastrado"
          texto="Cadastre colaboradores para que possam acessar a plataforma."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Novo funcionário"
            icon="person_add"
            unelevated
            no-caps
            :disable="!isAdmin"
            :to="isAdmin ? { name: 'funcionarios-novo' } : undefined"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogDesativar" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Desativar funcionário</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja desativar
          <strong>{{ funcionarioSelecionado?.nome }}</strong>?
          O acesso à plataforma será revogado.
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
          <div class="text-h6">Reativar funcionário</div>
        </q-card-section>

        <q-card-section>
          Tem certeza que deseja reativar
          <strong>{{ funcionarioSelecionado?.nome }}</strong>?
          O acesso à plataforma será restaurado.
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

<style scoped lang="scss">
.funcionarios-list__vinculo-tooltip {
  cursor: help;
  border-bottom: 1px dashed var(--ds-border-default);
}

.funcionarios-list__vinculo-tooltip-text {
  white-space: pre-line;
}
</style>
