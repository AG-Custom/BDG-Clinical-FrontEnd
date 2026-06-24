<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { DesignSystemColors } from '@/constants/design-system';
import { useEmpresaStore } from '@/stores/empresa.store';
import { validarCorHex } from '@/utils/whitelabel';

const TIPOS_LOGO_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'] as const;
const TAMANHO_MAX_LOGO = 2 * 1024 * 1024;

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const empresaStore = useEmpresaStore();

const salvando = ref(false);
const arquivoLogo = ref<File | null>(null);
const previewSelecionada = ref<string | null>(null);

const form = reactive({
  nome: '',
  cnpj: '',
  telefone: '',
  corPrincipal: DesignSystemColors.primary[600],
});

const previewLogo = computed(() => previewSelecionada.value);

watch(arquivoLogo, (novo) => {
  if (previewSelecionada.value) {
    URL.revokeObjectURL(previewSelecionada.value);
    previewSelecionada.value = null;
  }

  if (novo) {
    previewSelecionada.value = URL.createObjectURL(novo);
  }
});

function validarArquivoLogo(arquivo: File): string | null {
  if (!TIPOS_LOGO_ACEITOS.includes(arquivo.type as (typeof TIPOS_LOGO_ACEITOS)[number])) {
    return 'Formato não suportado. Envie PNG, JPEG ou WebP.';
  }

  if (arquivo.size > TAMANHO_MAX_LOGO) {
    return 'O arquivo deve ter no máximo 2 MB.';
  }

  return null;
}

function aoRejeitarArquivo(rejeitados: { failedPropValidation: string }[]): void {
  if (rejeitados.some((item) => item.failedPropValidation === 'max-file-size')) {
    notificacao.erro('O arquivo deve ter no máximo 2 MB.');
    return;
  }

  notificacao.erro('Arquivo não suportado.');
}

async function salvar(): Promise<void> {
  if (arquivoLogo.value) {
    const erroValidacao = validarArquivoLogo(arquivoLogo.value);

    if (erroValidacao) {
      notificacao.erro(erroValidacao);
      return;
    }
  }

  salvando.value = true;

  try {
    await empresaStore.criarEmpresa(
      {
        nome: form.nome,
        cnpj: form.cnpj.trim() || null,
        telefone: form.telefone.trim() || null,
        corPrincipal: form.corPrincipal || null,
      },
      arquivoLogo.value,
    );
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'empresas' });
}

onUnmounted(() => {
  if (previewSelecionada.value) {
    URL.revokeObjectURL(previewSelecionada.value);
  }
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Nova clínica"
      subtitulo="Cadastre outra clínica com o mesmo e-mail de acesso."
    />

    <q-card flat bordered>
      <q-card-section>
        <q-form class="form-stack" @submit.prevent="salvar">
          <q-input
            v-model="form.nome"
            label="Nome da clínica"
            outlined
            :rules="[(value: string) => Boolean(value) || 'Informe o nome da clínica']"
          />

          <q-input
            v-model="form.cnpj"
            label="CNPJ"
            outlined
            mask="##.###.###/####-##"
            unmasked-value
          />

          <q-input
            v-model="form.telefone"
            label="Telefone"
            outlined
            mask="(##) #####-####"
            unmasked-value
          />

          <div class="empresa-logo">
            <label class="empresa-logo__label">Logo</label>

            <div class="empresa-logo__content row items-start q-gutter-md">
              <div
                class="empresa-logo__preview"
                :class="{ 'empresa-logo__preview--empty': !previewLogo }"
              >
                <q-img
                  v-if="previewLogo"
                  :src="previewLogo"
                  alt="Pré-visualização da logo"
                  ratio="1"
                />
                <q-icon v-else name="image" size="32px" color="grey-5" />
              </div>

              <div class="col empresa-logo__upload">
                <q-file
                  v-model="arquivoLogo"
                  label="Selecionar imagem"
                  outlined
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  :max-file-size="TAMANHO_MAX_LOGO"
                  @rejected="aoRejeitarArquivo"
                >
                  <template #prepend>
                    <q-icon name="attach_file" />
                  </template>
                </q-file>

                <p class="empresa-logo__hint">PNG, JPEG ou WebP. Máximo 2 MB. Opcional.</p>
              </div>
            </div>
          </div>

          <div class="empresa-cor">
            <label class="empresa-cor__label">Cor principal</label>
            <div class="empresa-cor__picker row items-center q-gutter-md">
              <q-color
                v-model="form.corPrincipal"
                format-model="hex"
                no-header
                no-footer
              />
              <q-input
                v-model="form.corPrincipal"
                label="Hex"
                outlined
                class="col"
                :rules="[
                  (value: string) =>
                    !value || validarCorHex(value) || 'Use o formato #RGB ou #RRGGBB',
                ]"
              />
            </div>
          </div>

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Criar clínica"
              type="submit"
              unelevated
              no-caps
              :loading="salvando || empresaStore.criando"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped lang="scss">
.empresa-logo {
  &__label {
    display: block;
    margin-bottom: var(--ds-space-2);
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
  }

  &__content {
    flex-wrap: wrap;
  }

  &__preview {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    border: 1px solid var(--ds-border-default);
    border-radius: var(--ds-radius-md);
    overflow: hidden;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ds-bg-subtle);
    }
  }

  &__hint {
    margin: var(--ds-space-2) 0 0;
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
  }
}

.empresa-cor {
  &__label {
    display: block;
    margin-bottom: var(--ds-space-2);
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-sm);
  }

  &__picker {
    flex-wrap: wrap;
  }
}
</style>
