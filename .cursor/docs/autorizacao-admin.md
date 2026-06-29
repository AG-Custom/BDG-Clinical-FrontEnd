# Autorização — Admin e permissões granulares

## Fonte de verdade

O perfil e as permissões do usuário autenticado vêm de **`GET /api/auth/me`** (Bearer token).

| Campo | Significado |
|-------|-------------|
| `isAdmin: true` | Bypass total — todas as checagens de permissão retornam `true` |
| `isAdmin: false` | Funcionário — acesso definido por perfil + overrides |
| `permissoes[]` | Chaves efetivas resolvidas no servidor (ex.: `pacientes.criar`). Mapeadas de `permissions` na API |

O front sincroniza o usuário via `authStore.sincronizarUsuario()` após login, troca de empresa e na inicialização da app.

## Sessão e token (front-end)

O backend usa **JWT Bearer** (`Authorization: Bearer {token}`).

O token fica em **`localStorage`** (`src/utils/auth-storage.ts`), compartilhado entre abas do mesmo navegador.

Logout (`authStore.logout()`) limpa o storage.

## No front-end

### Store e composables

- `authStore.possuiPermissao(chave)` — bypass automático para admin
- `authStore.possuiAlgumaPermissao(chaves)` / `possuiTodasPermissoes` / `possuiModulo`
- `usePermissao(chave)` — computed reativo para uma chave
- `usePermissoes()` — helpers + `isAdmin`
- `useAdmin()` — legado; preferir `usePermissao` em novas features

```vue
<script setup lang="ts">
import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';

const podeCriar = usePermissao(permissoes.pacientes.criar);
</script>

<template>
  <q-btn label="Novo" :disable="!podeCriar" />
</template>
```

### Rotas

Rotas autenticadas definem `meta.permissao` em `src/router/routes.ts`. O guard em `src/router/index.ts` redireciona para a primeira rota permitida quando o usuário não tem acesso.

### Menu

Itens e seções do drawer em `MainLayout.vue` usam `v-if` com `possuiPermissao` / `possuiAlguma`. Seções expansíveis ficam ocultas quando nenhum filho é visível.

### Regra de UI

| Elemento | Comportamento |
|----------|---------------|
| Menu e rotas | **Ocultos** sem permissão mínima |
| Botões Novo / Editar / Desativar | `:disable="!podeAcao"` com chave específica |
| Formulários | `readonly` e Salvar `disable` quando sem permissão de escrita |

Admin (`isAdmin`) não precisa de checagem explícita nas páginas — o store faz bypass.

### Funcionários

- Toggle **Administrador** (`isAdmin`) no formulário — bypass total
- **Perfil de permissão** (`perfilId`) quando não é admin
- **Permissões avançadas** — overrides Allow/Deny em rota dedicada

### Checklist para novas features

1. Backend: `[RequirePermission("modulo.acao")]` nas rotas de escrita
2. Constantes em `src/constants/permissoes.ts`
3. `meta.permissao` na rota em `routes.ts`
4. `v-if` no item do menu em `MainLayout.vue`
5. Listagem/form: `usePermissao` por ação (criar, editar, desativar)

## Backend

Rotas protegidas retornam **403** sem permissão. O front oculta/desabilita para melhor UX; a API continua sendo a garantia final.
