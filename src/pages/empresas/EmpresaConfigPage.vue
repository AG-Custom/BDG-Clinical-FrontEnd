<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { empresaService } from '@/services/empresa.service';
import { useEmpresaStore } from '@/stores/empresa.store';
import { aplicarCorPrincipal, validarCorHex } from '@/utils/whitelabel';

const TIPOS_LOGO_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'] as const;
const TAMANHO_MAX_LOGO = 2 * 1024 * 1024;

const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();
const empresaStore = useEmpresaStore();

const carregando = ref(false);
const salvando = ref(false);
const enviandoLogo = ref(false);
const logoAtual = ref<string | null>(null);
const arquivoLogo = ref<File | null>(null);
const previewSelecionada = ref<string | null>(null);

const form = reactive({
  nome: '',
  cnpj: '',
  telefone: '',
  corPrincipal: '#059669',
  ativo: true,
});

const previewLogo = computed(() => previewSelecionada.value ?? logoAtual.value);

watch(arquivoLogo, (novo) => {
  if (previewSelecionada.value) {
    URL.revokeObjectURL(previewSelecionada.value);
    previewSelecionada.value = null;
  }

  if (novo) {
    previewSelecionada.value = URL.createObjectURL(novo);
  }
});

function preencherFormulario(): void {
  const empresa = empresaStore.empresaDetalhes;

  if (!empresa) {
    return;
  }

  form.nome = empresa.nome;
  form.cnpj = empresa.cnpj ?? '';
  form.telefone = empresa.telefone ?? '';
  form.corPrincipal = empresa.corPrincipal ?? '#059669';
  form.ativo = empresa.ativo;
  logoAtual.value = empresa.logo;
}

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

async function carregarEmpresa(): Promise<void> {
  carregando.value = true;

  try {
    await empresaStore.carregarEmpresaAtual();
    preencherFormulario();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'empresas' });
  } finally {
    carregando.value = false;
  }
}

async function enviarLogo(): Promise<void> {
  if (!arquivoLogo.value) {
    return;
  }

  const erroValidacao = validarArquivoLogo(arquivoLogo.value);

  if (erroValidacao) {
    notificacao.erro(erroValidacao);
    return;
  }

  enviandoLogo.value = true;

  try {
    const empresa = await empresaService.enviarLogo(arquivoLogo.value);

    empresaStore.definirEmpresaDetalhes(empresa);
    logoAtual.value = empresa.logo;
    arquivoLogo.value = null;

    notificacao.sucesso('Logo enviada com sucesso.');
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    enviandoLogo.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const empresa = await empresaService.atualizarAtual({
      nome: form.nome,
      cnpj: form.cnpj.trim() || null,
      telefone: form.telefone.trim() || null,
      logo: null,
      corPrincipal: form.corPrincipal || null,
      ativo: form.ativo,
    });

    empresaStore.definirEmpresaDetalhes(empresa);
    aplicarCorPrincipal(empresa.corPrincipal);
    logoAtual.value = empresa.logo;
    await empresaStore.carregarEmpresas();

    notificacao.sucesso('Dados da clínica atualizados com sucesso.');
    await router.push({ name: 'empresas' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'empresas' });
}

onMounted(() => {
  void carregarEmpresa();
});

onUnmounted(() => {
  if (previewSelecionada.value) {
    URL.revokeObjectURL(previewSelecionada.value);
  }
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Configurações da clínica"
      :subtitulo="`Personalize os dados de ${empresaStore.nomeEmpresaAtual}.`"
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <q-input
            v-model="form.nome"
            label="Nome da clínica"
            outlined
            :readonly="!isAdmin"
            :rules="[(value: string) => Boolean(value) || 'Informe o nome da clínica']"
          />

          <q-input
            v-model="form.cnpj"
            label="CNPJ"
            outlined
            mask="##.###.###/####-##"
            unmasked-value
            :readonly="!isAdmin"
          />

          <q-input
            v-model="form.telefone"
            label="Telefone"
            outlined
            mask="(##) #####-####"
            unmasked-value
            :readonly="!isAdmin"
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
                  alt="Logo da empresa"
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
                  :disable="!isAdmin || enviandoLogo"
                  @rejected="aoRejeitarArquivo"
                >
                  <template #prepend>
                    <q-icon name="attach_file" />
                  </template>
                </q-file>

                <p class="empresa-logo__hint">PNG, JPEG ou WebP. Máximo 2 MB.</p>

                <q-btn
                  v-if="arquivoLogo"
                  color="primary"
                  label="Enviar logo"
                  unelevated
                  no-caps
                  class="q-mt-sm"
                  :loading="enviandoLogo"
                  :disable="!isAdmin"
                  @click="enviarLogo"
                />
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
                :disable="!isAdmin"
              />
              <q-input
                v-model="form.corPrincipal"
                label="Hex"
                outlined
                class="col"
                :readonly="!isAdmin"
                :rules="[
                  (value: string) =>
                    !value || validarCorHex(value) || 'Use o formato #RGB ou #RRGGBB',
                ]"
              />
            </div>
          </div>

          <q-toggle
            v-model="form.ativo"
            label="Clínica ativa"
            :disable="!isAdmin"
            color="primary"
          />

          <q-banner
            v-if="!form.ativo"
            rounded
            class="bg-warning text-dark q-mt-sm"
            dense
          >
            Clínicas inativas bloqueiam o login de todos os usuários.
          </q-banner>

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!isAdmin"
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
