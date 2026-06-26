# Autorização — perfil Admin vs Funcionário

## Fonte de verdade

O perfil do usuário autenticado vem de **`GET /api/auth/me`** (Bearer token).

| Campo | Significado |
|-------|-------------|
| `isAdmin: true` | Perfil **Admin** — pode executar ações de gestão |
| `isAdmin: false` | Perfil **Funcionário** — visualiza telas, mas ações ficam desabilitadas |

O front sincroniza o usuário via `authStore.sincronizarUsuario()` após login e na inicialização da app.

## Sessão e token (front-end)

O backend usa **JWT Bearer** (`Authorization: Bearer {token}`) — **não** há cookie HTTP no fluxo atual.

O token fica em **`localStorage`** (`src/utils/auth-storage.ts`), compartilhado entre **abas** do mesmo navegador. Isso permite abrir cadastros em nova aba (ex.: alertas de dependência em formulários) sem novo login.

| Storage | Comportamento |
|---------|----------------|
| `localStorage` | Usado hoje — persiste entre abas até logout |
| `sessionStorage` | Legado — migrado automaticamente para `localStorage` na leitura |

Logout (`authStore.logout()`) limpa ambos os storages.

**Não** voltar a salvar o token só em `sessionStorage` — nova aba não enxerga a sessão.

## No front-end

### Store e composable

- Getter `authStore.isAdmin` em [`src/stores/auth.store.ts`](../src/stores/auth.store.ts)
- Composable `useAdmin()` em [`src/composables/useAdmin.ts`](../src/composables/useAdmin.ts)

```vue
<script setup lang="ts">
import { useAdmin } from '@/composables/useAdmin';

const { isAdmin } = useAdmin();
</script>

<template>
  <q-btn label="Novo" :disable="!isAdmin" />
</template>
```

### Regra de UI

| Elemento | Comportamento |
|----------|---------------|
| Menu e rotas | **Visíveis para todos** autenticados |
| Botões Novo / Editar / Desativar / Reativar | `:disable="!isAdmin"` |
| Formulários | Campos `readonly` e botão Salvar `disable` quando `!isAdmin` |

**Não** usar `v-if="isAdmin"` para esconder telas ou menus — apenas desabilitar ações.

### Checklist para novas features admin-only

1. Backend: restringir escrita a **Admin** (POST/PUT/DELETE/PATCH)
2. Listagem: botões de ação com `:disable="!isAdmin"`
3. Formulário: `:readonly="!isAdmin"` nos campos + Salvar com `:disable="!isAdmin"`
4. Botões com `:to`: usar `:to="isAdmin ? { name: '...' } : undefined"` junto com `:disable="!isAdmin"`

## Telas com ações admin-only hoje

| Módulo | Ações restritas |
|--------|-----------------|
| Unidades | Novo, Editar, Desativar, Reativar, Salvar |
| Funcionários | Novo, Editar, Desativar, Reativar, Salvar |

## Backend

Rotas de escrita retornam **403** para perfil Funcionário. O front desabilita botões para melhor UX; a API continua sendo a garantia final.
