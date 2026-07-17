<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useAuth } from '@/composables/useAuth';
import { usePermissoes } from '@/composables/usePermissao';
import { modulosMenu, permissoes, permissoesMenu } from '@/constants/permissoes';
import { DesignSystemLayout } from '@/constants/design-system';
import { useEmpresaStore } from '@/stores/empresa.store';

const ROTAS_SECAO_ATENDIMENTO = new Set([
  'pacientes',
  'pacientes-novo',
  'pacientes-editar',
  'pacientes-compras',
  'pacientes-compras-nova',
  'compras',
  'compras-nova',
  'aplicacoes-paciente',
  'aplicacoes-paciente-nova',
  'aplicacoes-paciente-editar',
  'procedimentos',
  'procedimentos-novo',
  'procedimentos-editar',
  'sintomas',
  'sintomas-novo',
  'sintomas-editar',
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

const ROTAS_SECAO_ESTOQUE = new Set([
  'saldos-estoque',
  'fornecedores',
  'fornecedores-novo',
  'fornecedores-editar',
  'pedidos-fornecedor',
  'pedidos-fornecedor-novo',
  'pedidos-fornecedor-editar',
  'movimentacoes-estoque',
  'movimentacoes-estoque-entrada',
  'movimentacoes-estoque-saida',
]);

const ROTAS_SECAO_MOVIMENTACOES = new Set([
  'movimentacoes-estoque',
  'movimentacoes-estoque-entrada',
  'movimentacoes-estoque-saida',
]);

const ROTAS_SECAO_VENDAS = new Set([
  'pacotes',
  'pacotes-novo',
  'pacotes-editar',
]);

const ROTAS_SECAO_FUNCIONARIOS = new Set([
  'funcionarios',
  'funcionarios-novo',
  'funcionarios-editar',
  'funcionarios-permissoes',
  'cargos',
  'cargos-novo',
  'cargos-editar',
]);

const drawer = ref(true);
const atendimentoMenuAberto = ref(false);
const produtosMenuAberto = ref(false);
const estoqueMenuAberto = ref(false);
const vendasMenuAberto = ref(false);
const funcionariosMenuAberto = ref(false);

const route = useRoute();
const auth = useAuth();
const { usuario, logout } = auth;
const { possuiPermissao, possuiAlguma } = usePermissoes();
const empresaStore = useEmpresaStore();

const menu = permissoesMenu;

const mostrarInicio = computed(() => possuiPermissao(menu.agenda));
const mostrarAtendimento = computed(() => possuiAlguma([...modulosMenu.atendimento]));
const mostrarProdutos = computed(() => possuiAlguma([...modulosMenu.produtos]));
const mostrarEstoque = computed(() => possuiAlguma([...modulosMenu.estoque]));
const mostrarVendas = computed(() => possuiAlguma([...modulosMenu.vendas]));
const mostrarUnidades = computed(() => possuiPermissao(menu.unidades));
const mostrarFuncionarios = computed(() => possuiAlguma([...modulosMenu.funcionarios]));

type MenuSecao = 'atendimento' | 'produtos' | 'estoque' | 'vendas' | 'funcionarios';

function fecharOutrasSecoesMenu(secaoAtiva: MenuSecao): void {
  if (secaoAtiva !== 'atendimento') {
    atendimentoMenuAberto.value = false;
  }

  if (secaoAtiva !== 'produtos') {
    produtosMenuAberto.value = false;
  }

  if (secaoAtiva !== 'estoque') {
    estoqueMenuAberto.value = false;
  }

  if (secaoAtiva !== 'vendas') {
    vendasMenuAberto.value = false;
  }

  if (secaoAtiva !== 'funcionarios') {
    funcionariosMenuAberto.value = false;
  }
}

watch(atendimentoMenuAberto, (aberto) => {
  if (aberto) {
    fecharOutrasSecoesMenu('atendimento');
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

watch(vendasMenuAberto, (aberto) => {
  if (aberto) {
    fecharOutrasSecoesMenu('vendas');
  }
});

watch(funcionariosMenuAberto, (aberto) => {
  if (aberto) {
    fecharOutrasSecoesMenu('funcionarios');
  }
});

const isSecaoAtendimento = computed(() => ROTAS_SECAO_ATENDIMENTO.has(route.name as string));
const isSecaoProdutos = computed(() => ROTAS_SECAO_PRODUTOS.has(route.name as string));
const isSecaoEstoque = computed(() => ROTAS_SECAO_ESTOQUE.has(route.name as string));
const isSecaoMovimentacoes = computed(() => ROTAS_SECAO_MOVIMENTACOES.has(route.name as string));
const isSecaoVendas = computed(() => ROTAS_SECAO_VENDAS.has(route.name as string));
const isSecaoFuncionarios = computed(() => ROTAS_SECAO_FUNCIONARIOS.has(route.name as string));

watch(
  () => route.name,
  () => {
    if (isSecaoAtendimento.value) {
      atendimentoMenuAberto.value = true;
    }

    if (isSecaoProdutos.value) {
      produtosMenuAberto.value = true;
    }

    if (isSecaoEstoque.value) {
      estoqueMenuAberto.value = true;
    }

    if (isSecaoVendas.value) {
      vendasMenuAberto.value = true;
    }

    if (isSecaoFuncionarios.value) {
      funcionariosMenuAberto.value = true;
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
          <app-empresa-marca variant="drawer" />
        </div>

        <q-scroll-area class="drawer-nav">
          <q-list padding class="drawer-menu-list">
            <q-item v-if="mostrarInicio" clickable v-ripple to="/" exact class="drawer-menu__item">
              <q-item-section side class="drawer-menu__icon">
                <q-icon name="space_dashboard" />
              </q-item-section>
              <q-item-section>Início</q-item-section>
            </q-item>

            <q-expansion-item
              v-if="mostrarAtendimento"
              v-model="atendimentoMenuAberto"
              :header-class="[
                'drawer-menu__item',
                isSecaoAtendimento ? 'drawer-menu__section--active' : '',
              ]"
            >
              <template #header>
                <q-item-section side class="drawer-menu__icon">
                  <q-icon name="personal_injury" />
                </q-item-section>
                <q-item-section>Atendimento</q-item-section>
              </template>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.pacientes)"
                clickable
                v-ripple
                :to="{ name: 'pacientes' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="people" />
                </q-item-section>
                <q-item-section>Pacientes</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.aplicacoes)"
                clickable
                v-ripple
                :to="{ name: 'aplicacoes-paciente' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="vaccines" />
                </q-item-section>
                <q-item-section>Aplicações</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.procedimentos)"
                clickable
                v-ripple
                :to="{ name: 'procedimentos' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="medical_services" />
                </q-item-section>
                <q-item-section>Procedimentos</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.sintomas)"
                clickable
                v-ripple
                :to="{ name: 'sintomas' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="healing" />
                </q-item-section>
                <q-item-section>Sintomas</q-item-section>
              </q-item>
            </q-expansion-item>

            <q-expansion-item
              v-if="mostrarProdutos"
              v-model="produtosMenuAberto"
              :header-class="[
                'drawer-menu__item',
                isSecaoProdutos ? 'drawer-menu__section--active' : '',
              ]"
            >
              <template #header>
                <q-item-section side class="drawer-menu__icon">
                  <q-icon name="category" />
                </q-item-section>
                <q-item-section>Produtos</q-item-section>
              </template>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.produtos)"
                clickable
                v-ripple
                :to="{ name: 'produtos' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="list_alt" />
                </q-item-section>
                <q-item-section>Catálogo</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.tiposProduto)"
                clickable
                v-ripple
                :to="{ name: 'tipos-produto' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="label" />
                </q-item-section>
                <q-item-section>Tipos de produtos</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.unidadesMedida)"
                clickable
                v-ripple
                :to="{ name: 'unidades-medida' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="straighten" />
                </q-item-section>
                <q-item-section>Unidades de medida</q-item-section>
              </q-item>
            </q-expansion-item>

            <q-expansion-item
              v-if="mostrarEstoque"
              v-model="estoqueMenuAberto"
              :header-class="[
                'drawer-menu__item',
                isSecaoEstoque ? 'drawer-menu__section--active' : '',
              ]"
            >
              <template #header>
                <q-item-section side class="drawer-menu__icon">
                  <q-icon name="inventory_2" />
                </q-item-section>
                <q-item-section>Estoque</q-item-section>
              </template>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.estoque)"
                clickable
                v-ripple
                :to="{ name: 'saldos-estoque' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="widgets" />
                </q-item-section>
                <q-item-section class="drawer-menu__label">Saldos</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.fornecedores)"
                clickable
                v-ripple
                :to="{ name: 'fornecedores' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="store" />
                </q-item-section>
                <q-item-section>Fornecedores</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.pedidosFornecedor)"
                clickable
                v-ripple
                :to="{ name: 'pedidos-fornecedor' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="receipt_long" />
                </q-item-section>
                <q-item-section>Pedidos ao fornecedor</q-item-section>
              </q-item>

              <q-item-label
                v-if="
                  possuiPermissao(menu.movimentacoesEstoque) ||
                  possuiPermissao(permissoes.estoque.movimentar)
                "
                header
                class="drawer-menu__group-label"
                :class="{ 'drawer-menu__group-label--active': isSecaoMovimentacoes }"
              >
                Movimentações
              </q-item-label>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.movimentacoesEstoque)"
                clickable
                v-ripple
                :to="{ name: 'movimentacoes-estoque' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="history" />
                </q-item-section>
                <q-item-section class="drawer-menu__label">Histórico</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(permissoes.estoque.movimentar)"
                clickable
                v-ripple
                :to="{ name: 'movimentacoes-estoque-entrada' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="add_circle_outline" />
                </q-item-section>
                <q-item-section class="drawer-menu__label">Registrar entrada</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(permissoes.estoque.movimentar)"
                clickable
                v-ripple
                :to="{ name: 'movimentacoes-estoque-saida' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="remove_circle_outline" />
                </q-item-section>
                <q-item-section class="drawer-menu__label">Registrar saída</q-item-section>
              </q-item>
            </q-expansion-item>

            <q-expansion-item
              v-if="mostrarVendas"
              v-model="vendasMenuAberto"
              :header-class="[
                'drawer-menu__item',
                isSecaoVendas ? 'drawer-menu__section--active' : '',
              ]"
            >
              <template #header>
                <q-item-section side class="drawer-menu__icon">
                  <q-icon name="point_of_sale" />
                </q-item-section>
                <q-item-section>Vendas</q-item-section>
              </template>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.pacotes)"
                clickable
                v-ripple
                :to="{ name: 'pacotes' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="inventory" />
                </q-item-section>
                <q-item-section>Pacotes</q-item-section>
              </q-item>
              <q-item disable class="drawer-menu__sub-item">
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="request_quote" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Orçamentos</q-item-label>
                  <q-item-label caption>Em breve</q-item-label>
                </q-item-section>
              </q-item>
              <q-item disable class="drawer-menu__sub-item">
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="assessment" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Relatórios</q-item-label>
                  <q-item-label caption>Em breve</q-item-label>
                </q-item-section>
              </q-item>
              <q-item disable class="drawer-menu__sub-item">
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="account_balance_wallet" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Contas a receber</q-item-label>
                  <q-item-label caption>Em breve</q-item-label>
                </q-item-section>
              </q-item>
              <q-item disable class="drawer-menu__sub-item">
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="payments" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Contas a pagar</q-item-label>
                  <q-item-label caption>Em breve</q-item-label>
                </q-item-section>
              </q-item>
            </q-expansion-item>

            <q-expansion-item
              v-if="mostrarFuncionarios"
              v-model="funcionariosMenuAberto"
              :header-class="[
                'drawer-menu__item',
                isSecaoFuncionarios ? 'drawer-menu__section--active' : '',
              ]"
            >
              <template #header>
                <q-item-section side class="drawer-menu__icon">
                  <q-icon name="groups" />
                </q-item-section>
                <q-item-section>Funcionários</q-item-section>
              </template>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.funcionarios)"
                clickable
                v-ripple
                :to="{ name: 'funcionarios' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="people" />
                </q-item-section>
                <q-item-section>Colaboradores</q-item-section>
              </q-item>
              <q-item class="drawer-menu__sub-item"
                v-if="possuiPermissao(menu.cargos)"
                clickable
                v-ripple
                :to="{ name: 'cargos' }"
              >
                <q-item-section side class="drawer-menu__sub-icon">
                  <q-icon name="badge" />
                </q-item-section>
                <q-item-section>Cargos</q-item-section>
              </q-item>
            </q-expansion-item>

            <q-item
              v-if="mostrarUnidades"
              clickable
              v-ripple
              :to="{ name: 'unidades' }"
              class="drawer-menu__item"
            >
              <q-item-section side class="drawer-menu__icon">
                <q-icon name="apartment" />
              </q-item-section>
              <q-item-section>Unidades</q-item-section>
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
