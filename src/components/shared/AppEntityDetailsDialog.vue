<script setup lang="ts">
import { computed } from 'vue';

import { formatarDataHoraBrasil } from '@/utils/data-hora';

type Registro = Record<string, unknown>;

interface CampoDetalhe {
  chave: string;
  label: string;
  valor: unknown;
}

const props = defineProps<{
  modelValue: boolean;
  titulo: string;
  registro: Registro | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const model = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const camposIgnorados = new Set([
  'id',
  'anexos',
  'aplicacaoPaciente',
  'ativo',
  'abaixoDoMinimo',
  'cancelada',
  'criadoEm',
  'atualizadoEm',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'isAdmin',
  'isCurrent',
  'itens',
  'links',
  'origem',
  'pendentePrimeiroAcesso',
  'permissoes',
  'permissions',
  'roles',
  'status',
  'tipoUsuario',
  'unidadeIds',
  'usuario',
]);

const campos = computed<CampoDetalhe[]>(() => {
  if (!props.registro) {
    return [];
  }

  return Object.entries(props.registro)
    .filter(([chave, valor]) => !deveIgnorarCampo(chave) && valor !== undefined && valor !== null && valor !== '')
    .filter(([, valor]) => !ehValorTecnico(valor))
    .slice(0, 12)
    .map(([chave, valor]) => ({
      chave,
      label: humanizarLabel(chave),
      valor,
    }));
});

const auditoria = computed(() => {
  if (!props.registro) {
    return [];
  }

  return [
    {
      label: 'Criado em',
      valor: props.registro.criadoEm,
      classe: 'entity-details__audit-row--created',
      icon: 'schedule',
    },
    {
      label: 'Atualizado em',
      valor: props.registro.atualizadoEm,
      classe: 'entity-details__audit-row--updated',
      icon: 'update',
    },
  ].filter((item) => Boolean(item.valor));
});

function humanizarLabel(chave: string): string {
  const comEspacos = chave
    .replace(/Nome$/i, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase());

  return comEspacos
    .replace(/\bId\b/g, 'ID')
    .replace(/\bCpf\b/g, 'CPF')
    .replace(/\bCnpj\b/g, 'CNPJ')
    .replace(/\bSku\b/g, 'SKU');
}

function deveIgnorarCampo(chave: string): boolean {
  const chaveNormalizada = chave.toLowerCase();

  if (camposIgnorados.has(chave) || camposIgnorados.has(chaveNormalizada)) {
    return true;
  }

  return (
    /(^|[A-Z_])ids?$/i.test(chave) ||
    chaveNormalizada.endsWith('id') ||
    chaveNormalizada.endsWith('ids') ||
    chaveNormalizada.includes('link') ||
    chaveNormalizada.includes('origem') ||
    chaveNormalizada.includes('password') ||
    chaveNormalizada.includes('senha') ||
    chaveNormalizada.includes('status') ||
    chaveNormalizada.includes('token')
  );
}

function ehValorTecnico(valor: unknown): boolean {
  if (Array.isArray(valor)) {
    return true;
  }

  if (valor && typeof valor === 'object') {
    return true;
  }

  if (typeof valor === 'string') {
    return pareceGuid(valor) || valor.includes('_');
  }

  return false;
}

function formatarValor(valor: unknown, chave = ''): string {
  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não';
  }

  if (deveFormatarMoeda(chave, valor)) {
    return formatarMoeda(valor);
  }

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    return formatarDataHora(valor);
  }

  return String(valor);
}

function deveFormatarMoeda(chave: string, valor: unknown): boolean {
  const chaveNormalizada = chave.toLowerCase();
  const ehNumero =
    typeof valor === 'number' ||
    (typeof valor === 'string' && valor.trim() !== '' && !Number.isNaN(Number(valor)));

  return ehNumero && (
    chaveNormalizada.includes('valor') ||
    chaveNormalizada.includes('preco') ||
    chaveNormalizada.includes('preço') ||
    chaveNormalizada.includes('total')
  );
}

function formatarMoeda(valor: unknown): string {
  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return String(valor);
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numero);
}

function pareceGuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

function formatarDataHora(valor: unknown): string {
  if (!valor) {
    return '';
  }

  return formatarDataHoraBrasil(String(valor));
}
</script>

<template>
  <q-dialog v-model="model">
    <q-card class="entity-details">
      <q-card-section class="entity-details__header">
        <div class="text-h6">{{ titulo }}</div>
        <q-btn v-close-popup flat round dense icon="close" aria-label="Fechar" />
      </q-card-section>

      <q-separator />

      <q-card-section class="entity-details__body">
        <section class="entity-details__section">
          <div class="entity-details__section-title">Dados</div>
          <div class="entity-details__grid">
            <div
              v-for="campo in campos"
              :key="campo.label"
              class="entity-details__field"
            >
              <span>{{ campo.label }}</span>
              <strong>{{ formatarValor(campo.valor, campo.chave) }}</strong>
            </div>
          </div>
        </section>

        <section class="entity-details__section">
          <div class="entity-details__audit-title">
            <q-icon name="history" />
            <span>Auditoria</span>
          </div>

          <div v-if="auditoria.length > 0" class="entity-details__audit">
            <div
              v-for="item in auditoria"
              :key="item.label"
              class="entity-details__audit-row"
              :class="item.classe"
            >
              <strong>{{ item.label }}</strong>
              <span>
                <q-icon :name="item.icon" />
                {{ formatarDataHora(item.valor) }}
              </span>
            </div>
          </div>

          <div v-else class="entity-details__audit-empty">
            Nenhum log de auditoria disponível para este registro.
          </div>
        </section>
      </q-card-section>

      <q-separator />

      <q-card-actions align="center" class="entity-details__actions">
        <q-btn v-close-popup outline color="negative" icon="close" label="Fechar" no-caps />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.entity-details {
  width: min(760px, calc(100vw - 32px));
  max-width: 760px;
}

.entity-details__header {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  border-top: 4px solid #008766;
  background: #f1faf6;
}

.entity-details__body {
  display: grid;
  gap: 12px;
  padding: 16px 24px;
}

.entity-details__section {
  border: 1px solid #d8dde3;
  border-radius: 6px;
  overflow: hidden;
}

.entity-details__section-title {
  padding: 14px 16px;
  background: #f7f7f7;
  color: #5b6470;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.entity-details__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
  padding: 14px 16px 16px;
}

.entity-details__field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.entity-details__field span {
  color: #111827;
  font-size: 12px;
  font-weight: 700;
}

.entity-details__field strong {
  color: #111827;
  font-weight: 500;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.entity-details__audit-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #00759a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.entity-details__audit {
  display: grid;
  gap: 8px;
  padding: 0 8px 12px;
}

.entity-details__audit-empty {
  color: #6b7280;
  padding: 0 16px 16px;
}

.entity-details__audit-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 12px;
  align-items: center;
  border-radius: 6px;
  padding: 9px 12px;
}

.entity-details__audit-row--created {
  background: #e2f3e9;
  color: #006b43;
}

.entity-details__audit-row--updated {
  background: #eef4ff;
  color: #1f5fbf;
}

.entity-details__audit-row strong {
  color: #111827;
  font-size: 12px;
  text-transform: uppercase;
}

.entity-details__audit-row span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.entity-details__actions {
  min-height: 72px;
}

@media (max-width: 760px) {
  .entity-details__grid {
    grid-template-columns: 1fr;
  }

  .entity-details__audit-row {
    grid-template-columns: 1fr;
  }
}
</style>
