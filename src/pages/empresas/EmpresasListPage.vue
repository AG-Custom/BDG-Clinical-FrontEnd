<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { useEmpresaStore } from '@/stores/empresa.store';
import type { EmpresaContexto } from '@/types/entidades/empresa';

function formatarCnpj(cnpj: string | null): string {
  if (!cnpj) {
    return '—';
  }

  const digitos = cnpj.replace(/\D/g, '');

  if (digitos.length !== 14) {
    return cnpj;
  }

  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatarTelefone(telefone: string | null): string {
  if (!telefone) {
    return '—';
  }

  const digitos = telefone.replace(/\D/g, '');

  if (digitos.length === 11) {
    return digitos.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (digitos.length === 10) {
    return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return telefone;
}

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const empresaStore = useEmpresaStore();

const carregando = ref(false);
const trocandoId = ref<string | null>(null);

const colunas = [
  { name: 'logo', label: '', field: 'logo', align: 'left' as const },
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' as const, sortable: true },
  { name: 'cnpj', label: 'CNPJ', field: 'cnpj', align: 'left' as const },
  { name: 'telefone', label: 'Telefone', field: 'telefone', align: 'left' as const },
  { name: 'status', label: 'Status', field: 'ativo', align: 'center' as const },
  { name: 'contexto', label: 'Contexto', field: 'isCurrent', align: 'center' as const },
  { name: 'acoes', label: 'Ações', field: 'acoes', align: 'right' as const },
];

async function carregarEmpresas(): Promise<void> {
  carregando.value = true;

  try {
    await empresaStore.carregarEmpresas();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

async function acessarEmpresa(empresa: EmpresaContexto): Promise<void> {
  if (empresa.isCurrent || !empresa.ativo) {
    return;
  }

  trocandoId.value = empresa.empresaId;

  try {
    await empresaStore.trocarEmpresa(empresa.empresaId);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    trocandoId.value = null;
  }
}

function configurarEmpresaAtual(): void {
  router.push({ name: 'empresas-atual' });
}

onMounted(() => {
  void carregarEmpresas();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Empresas"
      subtitulo="Clínicas vinculadas ao seu e-mail de acesso."
    >
      <q-btn
        color="primary"
        label="Nova clínica"
        icon="add"
        unelevated
        no-caps
        :to="{ name: 'empresas-nova' }"
      />
    </app-page-header>

    <q-card flat bordered>
      <q-table
        v-if="empresaStore.empresasDisponiveis.length > 0 || carregando"
        :rows="empresaStore.empresasDisponiveis"
        :columns="colunas"
        row-key="empresaId"
        flat
        :loading="carregando || empresaStore.trocando"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-logo="props">
          <q-td :props="props">
            <q-avatar v-if="props.row.logo" size="36px">
              <img :src="props.row.logo" :alt="`Logo ${props.row.nome}`" />
            </q-avatar>
            <q-avatar v-else size="36px" color="primary" text-color="white" icon="business" />
          </q-td>
        </template>

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

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.ativo ? 'positive' : 'grey'"
              :label="props.row.ativo ? 'Ativa' : 'Inativa'"
            />
          </q-td>
        </template>

        <template #body-cell-contexto="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.isCurrent"
              color="primary"
              label="Atual"
            />
            <span v-else class="text-grey-6">—</span>
          </q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn
              v-if="props.row.isCurrent"
              flat
              dense
              no-caps
              color="primary"
              label="Configurar"
              icon="settings"
              @click="configurarEmpresaAtual"
            />
            <q-btn
              v-else
              flat
              dense
              no-caps
              color="primary"
              label="Acessar"
              icon="login"
              :disable="!props.row.ativo"
              :loading="trocandoId === props.row.empresaId"
              @click="acessarEmpresa(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <q-card-section v-else-if="!carregando">
        <app-empty-state
          icon="business"
          titulo="Nenhuma clínica encontrada"
          texto="Cadastre uma nova clínica para começar a usar a plataforma."
        />
        <div class="text-center q-mt-md">
          <q-btn
            color="primary"
            label="Nova clínica"
            icon="add"
            unelevated
            no-caps
            :to="{ name: 'empresas-nova' }"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>
