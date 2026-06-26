<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useAuth } from '@/composables/useAuth';
import { DesignSystemLayout } from '@/constants/design-system';
import { useEmpresaStore } from '@/stores/empresa.store';

const ROTAS_SECAO_ATENDIMENTO = new Set([
  'pacientes',
  'pacientes-novo',
  'pacientes-editar',
  'aplicacoes-paciente',
  'aplicacoes-paciente-nova',
  'aplicacoes-paciente-editar',
  'sintomas',
  'sintomas-novo',
  'sintomas-editar',
]);

const ROTAS_SECAO_FUNCIONARIOS = new Set([
  'funcionarios',
  'funcionarios-novo',
  'funcionarios-editar',
  'cargos',
  'cargos-novo',
  'cargos-editar',
]);

const ROTAS_SECAO_PRODUTOS = new Set([
  'produtos',
  'produtos-novo',
  'produtos-editar',
  'tipos-produto',
  'tipos-produto-novo',
  'tipos-produto-editar',
  'unidades-medida',
  'unidades-medida-nova',
  'unidades-medida-editar',
]);

const ROTAS_SECAO_ESTOQUE = new Set(['saldos-estoque', 'movimentacoes-estoque']);

const ROTAS_SECAO_COMPRAS = new Set([
  'fornecedores',
  'fornecedores-novo',
  'fornecedores-editar',
  'pedidos-fornecedor',
  'pedidos-fornecedor-novo',
  'pedidos-fornecedor-editar',
]);

const drawer = ref(true);
const atendimentoMenuAberto = ref(false);
const funcionariosMenuAberto = ref(false);
const produtosMenuAberto = ref(false);
const estoqueMenuAberto = ref(false);
const comprasMenuAberto = ref(false);
const route = useRoute();
const auth = useAuth();
const { usuario, logout } = auth;
const empresaStore = useEmpresaStore();

type MenuSecao = 'atendimento' | 'funcionarios' | 'produtos' | 'estoque' | 'compras';

function fecharOutrasSecoesMenu(secaoAtiva: MenuSecao): void {
  if (secaoAtiva !== 'atendimento') {
    atendimentoMenuAberto.value = false;
  }

  if (secaoAtiva !== 'funcionarios') {
    funcionariosMenuAberto.value = false;
  }

  if (secaoAtiva !== 'produtos') {
    produtosMenuAberto.value = false;
  }

  if (secaoAtiva !== 'estoque') {
    estoqueMenuAberto.value = false;
  }

  if (secaoAtiva !== 'compras') {
    comprasMenuAberto.value = false;
  }
}

watch(atendimentoMenuAberto, (aberto) => {
  if (aberto) {
    fecharOutrasSecoesMenu('atendimento');
  }
});

watch(funcionariosMenuAberto, (aberto) => {
  if (aberto) {
    fecharOutrasSecoesMenu('funcionarios');
  }
});

watch(produtosMenuAberto, (aberto) => {
  if (aberto) {
    fecharOutrasSecoesMenu('produtos');
  }
});

watch(estoqueMenuAberto, (aberto) => {
  if (aberto) {
    fecharOutrasSecoesMenu('estoque');
  }
});

watch(comprasMenuAberto, (aberto) => {
  if (aberto) {
    fecharOutrasSecoesMenu('compras');
  }
});

const isSecaoAtendimento = computed(() =>
  ROTAS_SECAO_ATENDIMENTO.has(route.name as string),
);

const isSecaoFuncionarios = computed(() =>
  ROTAS_SECAO_FUNCIONARIOS.has(route.name as string),
);

const isSecaoProdutos = computed(() => ROTAS_SECAO_PRODUTOS.has(route.name as string));

const isSecaoEstoque = computed(() => ROTAS_SECAO_ESTOQUE.has(route.name as string));

const isSecaoCompras = computed(() => ROTAS_SECAO_COMPRAS.has(route.name as string));

watch(
  () => route.name,
  () => {
    if (isSecaoAtendimento.value) {
      atendimentoMenuAberto.value = true;
    }

    if (isSecaoFuncionarios.value) {
      funcionariosMenuAberto.value = true;
    }

    if (isSecaoProdutos.value) {
      produtosMenuAberto.value = true;
    }

    if (isSecaoEstoque.value) {
      estoqueMenuAberto.value = true;
    }

    if (isSecaoCompras.value) {
      comprasMenuAberto.value = true;
    }
  },
  { immediate: true },
);

onMounted(() => {
  void empresaStore.carregarEmpresaAtual();
  void empresaStore.carregarEmpresas();
});
</script>

<template>
  <q-layout view="hHh Lpr lFf" class="shell-premium">
    <q-header class="text-dark">
      <q-toolbar :style="{ minHeight: DesignSystemLayout.headerHeight }">
        <q-btn
          flat
          round
          dense
          icon="menu"
          aria-label="Abrir menu"
          @click="drawer = !drawer"
        />

        <q-space />

        <app-empresa-switcher />

        <q-btn flat round icon="account_circle" aria-label="Menu da conta" class="q-ml-sm">
          <q-menu>
            <q-list style="min-width: 240px">
              <q-item>
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ usuario?.nome || 'Usuário' }}
                  </q-item-label>
                  <q-item-label caption>{{ usuario?.email }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>Sair</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawer"
      show-if-above
      :width="DesignSystemLayout.drawerWidth"
    >
      <div class="drawer-shell">
        <div class="drawer-brand drawer-brand--logo">
          <app-empresa-marca compact />
        </div>

        <q-scroll-area class="drawer-nav">
          <q-list padding>
        <q-item clickable v-ripple to="/" exact>
          <q-item-section avatar>
            <q-icon name="space_dashboard" />
          </q-item-section>
          <q-item-section>Início</q-item-section>
        </q-item>
        <q-item clickable v-ripple :to="{ name: 'unidades' }">
          <q-item-section avatar>
            <q-icon name="apartment" />
          </q-item-section>
          <q-item-section>Unidades</q-item-section>
        </q-item>
        <q-expansion-item
          v-model="atendimentoMenuAberto"
          icon="personal_injury"
          label="Atendimento"
          :header-class="isSecaoAtendimento ? 'drawer-menu__section--active' : ''"
        >
          <q-item clickable v-ripple :to="{ name: 'pacientes' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="people" size="20px" />
            </q-item-section>
            <q-item-section>Pacientes</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'aplicacoes-paciente' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="vaccines" size="20px" />
            </q-item-section>
            <q-item-section>Aplicações</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'sintomas' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="healing" size="20px" />
            </q-item-section>
            <q-item-section>Sintomas</q-item-section>
          </q-item>
        </q-expansion-item>
        <q-expansion-item
          v-model="funcionariosMenuAberto"
          icon="groups"
          label="Funcionários"
          :header-class="isSecaoFuncionarios ? 'drawer-menu__section--active' : ''"
        >
          <q-item clickable v-ripple :to="{ name: 'funcionarios' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="people" size="20px" />
            </q-item-section>
            <q-item-section>Colaboradores</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'cargos' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="badge" size="20px" />
            </q-item-section>
            <q-item-section>Cargos</q-item-section>
          </q-item>
        </q-expansion-item>
        <q-expansion-item
          v-model="produtosMenuAberto"
          icon="category"
          label="Produtos"
          :header-class="isSecaoProdutos ? 'drawer-menu__section--active' : ''"
        >
          <q-item clickable v-ripple :to="{ name: 'produtos' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="list_alt" size="20px" />
            </q-item-section>
            <q-item-section>Catálogo</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'tipos-produto' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="label" size="20px" />
            </q-item-section>
            <q-item-section>Tipos de produto</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'unidades-medida' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="straighten" size="20px" />
            </q-item-section>
            <q-item-section>Unidades de medida</q-item-section>
          </q-item>
        </q-expansion-item>
        <q-expansion-item
          v-model="estoqueMenuAberto"
          icon="inventory_2"
          label="Estoque"
          :header-class="isSecaoEstoque ? 'drawer-menu__section--active' : ''"
        >
          <q-item clickable v-ripple :to="{ name: 'saldos-estoque' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="widgets" size="20px" />
            </q-item-section>
            <q-item-section>Saldos</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'movimentacoes-estoque' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="swap_horiz" size="20px" />
            </q-item-section>
            <q-item-section>Movimentações</q-item-section>
          </q-item>
        </q-expansion-item>
        <q-expansion-item
          v-model="comprasMenuAberto"
          icon="shopping_cart"
          label="Compras"
          :header-class="isSecaoCompras ? 'drawer-menu__section--active' : ''"
        >
          <q-item clickable v-ripple :to="{ name: 'fornecedores' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="store" size="20px" />
            </q-item-section>
            <q-item-section>Fornecedores</q-item-section>
          </q-item>
          <q-item clickable v-ripple :to="{ name: 'pedidos-fornecedor' }" :inset-level="1">
            <q-item-section avatar class="drawer-menu__sub-icon">
              <q-icon name="receipt_long" size="20px" />
            </q-item-section>
            <q-item-section>Pedidos ao fornecedor</q-item-section>
          </q-item>
        </q-expansion-item>
        <q-item clickable v-ripple :to="{ name: 'empresas' }">
          <q-item-section avatar>
            <q-icon name="business" />
          </q-item-section>
          <q-item-section>Empresas</q-item-section>
        </q-item>
          </q-list>
        </q-scroll-area>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <app-troca-empresa-overlay />
  </q-layout>
</template>

<style scoped lang="scss">
.drawer-menu__section--active {
  color: var(--ds-color-primary-700);
  font-weight: var(--ds-font-weight-semibold);
}
</style>
