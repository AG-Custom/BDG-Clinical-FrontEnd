import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/pages/auth/LoginPage.vue'),
        meta: { publica: true },
      },
    ],
  },
  {
    path: '/cadastro',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'cadastro',
        component: () => import('@/pages/auth/RegisterPage.vue'),
        meta: { publica: true },
      },
    ],
  },
  {
    path: '/primeiro-acesso',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'primeiro-acesso',
        component: () => import('@/pages/auth/PrimeiroAcessoPage.vue'),
        meta: { publica: true },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/pages/dashboard/DashboardPage.vue'),
      },
      {
        path: 'unidades',
        name: 'unidades',
        component: () => import('@/pages/unidades/UnidadesListPage.vue'),
      },
      {
        path: 'unidades/nova',
        name: 'unidades-nova',
        component: () => import('@/pages/unidades/UnidadeFormPage.vue'),
      },
      {
        path: 'unidades/:id/editar',
        name: 'unidades-editar',
        component: () => import('@/pages/unidades/UnidadeFormPage.vue'),
      },
      {
        path: 'pacientes',
        name: 'pacientes',
        component: () => import('@/pages/pacientes/PacientesListPage.vue'),
      },
      {
        path: 'pacientes/novo',
        name: 'pacientes-novo',
        component: () => import('@/pages/pacientes/PacienteFormPage.vue'),
      },
      {
        path: 'pacientes/:id/editar',
        name: 'pacientes-editar',
        component: () => import('@/pages/pacientes/PacienteFormPage.vue'),
      },
      {
        path: 'funcionarios',
        name: 'funcionarios',
        component: () => import('@/pages/funcionarios/FuncionariosListPage.vue'),
      },
      {
        path: 'funcionarios/novo',
        name: 'funcionarios-novo',
        component: () => import('@/pages/funcionarios/FuncionarioFormPage.vue'),
      },
      {
        path: 'funcionarios/:id/editar',
        name: 'funcionarios-editar',
        component: () => import('@/pages/funcionarios/FuncionarioFormPage.vue'),
      },
      {
        path: 'cargos',
        name: 'cargos',
        component: () => import('@/pages/cargos/CargosListPage.vue'),
      },
      {
        path: 'cargos/novo',
        name: 'cargos-novo',
        component: () => import('@/pages/cargos/CargoFormPage.vue'),
      },
      {
        path: 'cargos/:id/editar',
        name: 'cargos-editar',
        component: () => import('@/pages/cargos/CargoFormPage.vue'),
      },
      {
        path: 'produtos',
        name: 'produtos',
        component: () => import('@/pages/produtos/ProdutosListPage.vue'),
      },
      {
        path: 'produtos/novo',
        name: 'produtos-novo',
        component: () => import('@/pages/produtos/ProdutoFormPage.vue'),
      },
      {
        path: 'produtos/:id/editar',
        name: 'produtos-editar',
        component: () => import('@/pages/produtos/ProdutoFormPage.vue'),
      },
      {
        path: 'tipos-produto',
        name: 'tipos-produto',
        component: () => import('@/pages/tipos-produto/TiposProdutoListPage.vue'),
      },
      {
        path: 'tipos-produto/novo',
        name: 'tipos-produto-novo',
        component: () => import('@/pages/tipos-produto/TipoProdutoFormPage.vue'),
      },
      {
        path: 'tipos-produto/:id/editar',
        name: 'tipos-produto-editar',
        component: () => import('@/pages/tipos-produto/TipoProdutoFormPage.vue'),
      },
      {
        path: 'unidades-medida',
        name: 'unidades-medida',
        component: () => import('@/pages/unidades-medida/UnidadesMedidaListPage.vue'),
      },
      {
        path: 'unidades-medida/nova',
        name: 'unidades-medida-nova',
        component: () => import('@/pages/unidades-medida/UnidadeMedidaFormPage.vue'),
      },
      {
        path: 'unidades-medida/:id/editar',
        name: 'unidades-medida-editar',
        component: () => import('@/pages/unidades-medida/UnidadeMedidaFormPage.vue'),
      },
      {
        path: 'empresas',
        name: 'empresas',
        component: () => import('@/pages/empresas/EmpresasListPage.vue'),
      },
      {
        path: 'empresas/nova',
        name: 'empresas-nova',
        component: () => import('@/pages/empresas/EmpresaFormPage.vue'),
      },
      {
        path: 'empresas/atual',
        name: 'empresas-atual',
        component: () => import('@/pages/empresas/EmpresaConfigPage.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/ErrorNotFound.vue'),
    meta: { publica: true },
  },
];
