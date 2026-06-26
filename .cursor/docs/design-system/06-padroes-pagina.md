# 06 — Padrões de página

Templates visuais para os tipos de tela do BGD Clinical.

## Auth (Login / Cadastro)

**Layout:** `AuthLayout` → `AppAuthPanel`

```
AppAuthPanel
├── AppBrand (título + subtítulo)
└── q-form.form-stack
    ├── q-input (campos)
    ├── q-btn primário (submit, full-width)
    └── q-btn flat (navegação alternativa, full-width)
```

### Checklist auth

- [ ] Usar `AppAuthPanel`, nunca montar `.auth-page` manualmente
- [ ] Formulário com classe `form-stack`
- [ ] Inputs `outlined` com ícone prepend
- [ ] Senha com toggle visibility (append icon button)
- [ ] Botão submit: `color="primary" unelevated no-caps full-width`
- [ ] Link alternativo: `flat no-caps color="primary" full-width`
- [ ] Loading no botão submit via `:loading="carregando"`

### Referência

- `src/pages/auth/LoginPage.vue`
- `src/pages/auth/RegisterPage.vue`

---

## Dashboard

**Layout:** `MainLayout` → `q-page.page-content`

```
q-page (padding)
├── AppPageHeader (titulo + subtitulo)
├── row q-col-gutter-md (métricas)
│   └── AppMetricCard × N
└── q-card (seção principal)
    └── AppEmptyState ou conteúdo
```

### Checklist dashboard

- [ ] `AppPageHeader` como primeiro elemento
- [ ] Métricas em grid responsivo (`col-12 col-sm-6 col-md-4`)
- [ ] Usar `AppMetricCard` para indicadores
- [ ] Seção principal em `q-card flat bordered`
- [ ] Empty state quando não há dados

### Referência

- `src/pages/dashboard/DashboardPage.vue`

---

## Listagem (CRUD index)

Template para telas de listagem futuras:

```
q-page.page-content (padding)
├── AppPageHeader
│   ├── titulo + subtitulo
│   └── q-btn "Novo" (slot direito)
├── q-card flat bordered (filtros — opcional)
│   └── row com q-input de busca
└── q-card flat bordered
    ├── q-table (quando há dados)
    ├── AppTableSkeleton (carregando, lista vazia)
    └── AppEmptyState (carregamento concluído, lista vazia)
```

### Estados da listagem (performance percebida)

Ver também `.cursor/rules/01-performance.mdc` — seção *Listagens — carregamento e empty state*.

1. **Carregando sem dados** → `AppTableSkeleton` (`carregando === true`, `itens.length === 0`)
2. **Dados** → `q-table` (`itens.length > 0`, `:loading="carregando"` em recargas)
3. **Vazio confirmado** → `AppEmptyState` (`carregando === false`, `itens.length === 0`)

`const carregando = ref(true)` na montagem — nunca `false` antes da primeira resposta da API.

### Convenções de tabela

- Paginação server-side quando > 50 registros
- Ações por linha: ícones `edit`, `delete` com `flat round dense`
- Status via `q-badge` com cores semânticas
- Loading com dados na tela: `:loading` do `q-table` apenas
- Loading sem dados na tela: `AppTableSkeleton`, não spinner dentro da tabela

---

## Formulário (CRUD create/edit)

```
q-page.page-content.page-content--form (padding)
├── AppPageHeader (titulo = "Novo X" ou "Editar X")
├── q-card flat bordered
│   └── q-form.form-stack
│       ├── campos (max 2 colunas em md+)
│       └── row com botões (Salvar + Cancelar)
```

Formulários com grids/tabelas de linhas (ex.: pedido ao fornecedor): usar `page-content--form-wide` (960px). Listagens continuam com `page-content--fluid`.

### Convenções de formulário

- Largura: `page-content--form` (720px) ou `page-content--form-wide` (960px) — nunca `--fluid` em forms
- Campos obrigatórios: classe `form-field--required` + validação via `:rules`
- Campos opcionais: label limpo, sem sufixo "(opcional)"
- Erros de API: `useTratarErroFormulario()` + `useNotificacao()`
- Botão salvar à esquerda, cancelar à direita (ou cancelar flat)
- Em mobile: botões full-width empilhados

### Alertas de dependência vazia

Quando o formulário depende de outro cadastro (produto, unidade, aplicador etc.):

- Componente: `<app-form-dependencia-alerta>` — registro global **`AppFormDependenciaAlerta`** (não `Alert`)
- Posição: **abaixo** do campo, dentro de `form-field-stack` — nunca no `#hint` com campo `disabled`
- Condição: API retornou `data: []` → `lista.length === 0` após `dadosIniciaisCarregados`
- `:disable` sem `lista.length === 0`
- Documentação completa: [07-alertas-dependencia-formulario.md](./07-alertas-dependencia-formulario.md)

---

## Detalhe (view)

```
q-page.page-content (padding)
├── AppPageHeader
│   ├── titulo (nome da entidade)
│   └── ações (Editar, Excluir)
├── q-card flat bordered (dados principais)
└── q-card flat bordered (seções relacionadas — tabs opcional)
```

---

## Erro 404

```
q-page (centralizado)
├── q-icon primary (64px)
├── h1.not-found-title
├── p.ds-text-secondary
└── q-btn primary → home
```

### Referência

- `src/pages/ErrorNotFound.vue`

---

## Feedback e estados

| Estado | Componente / Padrão |
|--------|---------------------|
| Loading global | `:loading` no botão ou `q-inner-loading` no card |
| Lista carregando (sem linhas) | `AppTableSkeleton` |
| Lista vazia (após API) | `AppEmptyState` |
| Lista recarregando (com linhas) | `:loading` no `q-table` |
| Erro de API | `useNotificacao().erro()` |
| Sucesso | `useNotificacao().sucesso()` |
| Confirmação de exclusão | `q-dialog` com botões Cancelar (flat) + Excluir (negative) |

---

## Checklist para nova página

1. Escolher layout (`MainLayout` ou `AuthLayout`)
2. Adicionar rota em `src/router/routes.ts`
3. Usar `AppPageHeader` (páginas internas)
4. Aplicar classe `page-content` no `q-page`
5. Consumir tokens — zero hex hardcoded
6. Reutilizar componentes App* existentes
7. Validar responsividade nos breakpoints sm e md
