<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAdmin } from '@/composables/useAdmin';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { funcionarioService } from '@/services/funcionario.service';
import { cargoService } from '@/services/cargo.service';
import { unidadeService } from '@/services/unidade.service';
import { extrairDadosVinculo } from '@/types/entidades/funcionario';
import type { Cargo } from '@/types/entidades/cargo';
import type { Unidade } from '@/types/entidades/unidade';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const { isAdmin } = useAdmin();

const carregando = ref(false);
const salvando = ref(false);
const unidadesDisponiveis = ref<Unidade[]>([]);
const cargosDisponiveis = ref<Cargo[]>([]);
const dadosIniciaisCarregados = ref(false);

const isEdicao = computed(() => route.name === 'funcionarios-editar');
const funcionarioId = computed(() => route.params.id as string | undefined);
const emailLoginEdicao = ref('');

const form = reactive({
  nome: '',
  telefone: '',
  emailLogin: '',
  linkToEmpresa: false,
  unidadeIds: [] as string[],
  cargoId: null as string | null,
  flagAplicador: false,
});

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value.map((unidade) => ({
    label: unidade.nome,
    value: unidade.id,
  })),
);

const opcoesCargos = computed(() =>
  cargosDisponiveis.value.map((cargo) => ({
    label: cargo.ativo ? cargo.nome : `${cargo.nome} (inativo)`,
    value: cargo.id,
  })),
);

const mostrarAlertaUnidades = computed(
  () =>
    dadosIniciaisCarregados.value &&
    isAdmin.value &&
    !form.linkToEmpresa &&
    opcoesUnidades.value.length === 0,
);

const mostrarAlertaCargos = computed(
  () => dadosIniciaisCarregados.value && isAdmin.value && opcoesCargos.value.length === 0,
);

watch(
  () => form.linkToEmpresa,
  (vinculoEmpresa) => {
    if (vinculoEmpresa) {
      form.unidadeIds = [];
    }
  },
);

function validarEmail(value: string): boolean | string {
  if (!value) {
    return 'Informe o e-mail';
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return emailValido || 'Informe um e-mail válido';
}

function validarUnidades(): boolean | string {
  if (form.linkToEmpresa) {
    return true;
  }

  return form.unidadeIds.length > 0 || 'Selecione ao menos uma unidade';
}

async function carregarUnidades(): Promise<void> {
  try {
    unidadesDisponiveis.value = await unidadeService.listar(false);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarCargos(): Promise<void> {
  try {
    cargosDisponiveis.value = await cargoService.listar(false);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarDependenciasIniciais(): Promise<void> {
  try {
    await Promise.all([carregarUnidades(), carregarCargos()]);
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function recarregarDependencias(): Promise<void> {
  dadosIniciaisCarregados.value = false;

  try {
    await Promise.all([carregarUnidades(), carregarCargos()]);
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function garantirCargoNaLista(cargoId: string): Promise<void> {
  if (cargosDisponiveis.value.some((cargo) => cargo.id === cargoId)) {
    return;
  }

  try {
    const cargo = await cargoService.obter(cargoId);
    cargosDisponiveis.value = [cargo, ...cargosDisponiveis.value];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarFuncionario(): Promise<void> {
  if (!isEdicao.value || !funcionarioId.value) {
    return;
  }

  carregando.value = true;

  try {
    const funcionario = await funcionarioService.obter(funcionarioId.value);
    const vinculo = extrairDadosVinculo(funcionario);

    form.nome = funcionario.nome;
    form.telefone = funcionario.telefone ?? '';
    form.unidadeIds = vinculo.unidadeIds;
    form.cargoId = vinculo.cargoId;
    form.flagAplicador = vinculo.flagAplicador;
    form.linkToEmpresa = vinculo.linkToEmpresa;
    emailLoginEdicao.value = funcionario.emailLogin;

    if (vinculo.cargoId) {
      await garantirCargoNaLista(vinculo.cargoId);
    }
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'funcionarios' });
  } finally {
    carregando.value = false;
  }
}

function montarPayloadVinculo() {
  return {
    linkToEmpresa: form.linkToEmpresa,
    unidadeIds: form.linkToEmpresa ? null : form.unidadeIds,
    cargoId: form.cargoId,
    flagAplicador: form.flagAplicador,
  };
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const telefone = form.telefone.trim() || null;
    const vinculo = montarPayloadVinculo();

    if (isEdicao.value && funcionarioId.value) {
      await funcionarioService.atualizar(funcionarioId.value, {
        nome: form.nome,
        telefone,
        email: emailLoginEdicao.value,
        ...vinculo,
      });
      notificacao.sucesso('Funcionário atualizado com sucesso.');
    } else {
      const emailLogin = form.emailLogin.trim();

      await funcionarioService.criar({
        nome: form.nome,
        telefone,
        email: emailLogin,
        emailLogin,
        ...vinculo,
      });
      notificacao.sucesso(
        'Funcionário cadastrado com sucesso. Ele receberá instruções para o primeiro acesso.',
      );
    }

    await router.push({ name: 'funcionarios' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'funcionarios' });
}

onMounted(async () => {
  await carregarDependenciasIniciais();
  await carregarFuncionario();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar funcionário' : 'Novo funcionário'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados e vínculos do colaborador.'
          : 'Cadastre um colaborador. A senha será definida no primeiro acesso.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <div class="text-subtitle2 text-weight-medium">Dados pessoais</div>

          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome"
            outlined
            :readonly="!isAdmin"
            :rules="[(value: string) => Boolean(value) || 'Informe o nome']"
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.telefone"
                label="Telefone"
                outlined
                mask="(##) #####-####"
                unmasked-value
                fill-mask
                :readonly="!isAdmin"
              />
            </div>
          </div>

          <q-separator class="q-my-sm" />

          <div class="text-subtitle2 text-weight-medium">Acesso à plataforma</div>

          <q-input
            v-if="!isEdicao"
            v-model="form.emailLogin"
            class="form-field--required"
            label="E-mail"
            type="email"
            outlined
            hint="Usado para login na plataforma e contato. Não pode ser alterado depois."
            :readonly="!isAdmin"
            :rules="[validarEmail]"
          />

          <q-input
            v-else
            :model-value="emailLoginEdicao"
            label="E-mail"
            outlined
            readonly
            hint="O e-mail não pode ser alterado."
          />

          <q-banner v-if="!isEdicao" dense rounded class="funcionario-form__info-banner">
            <template #avatar>
              <q-icon name="info" color="primary" />
            </template>
            Não é necessário definir senha. O colaborador criará a senha no primeiro acesso.
          </q-banner>

          <q-separator class="q-my-sm" />

          <div class="text-subtitle2 text-weight-medium">Vínculo</div>

          <q-toggle
            v-model="form.linkToEmpresa"
            label="Atua em todas as unidades da empresa"
            color="primary"
            :disable="!isAdmin"
          />

          <q-select
            v-if="!form.linkToEmpresa"
            v-model="form.unidadeIds"
            :class="{ 'form-field--required': !form.linkToEmpresa }"
            :options="opcoesUnidades"
            label="Unidades"
            outlined
            multiple
            use-chips
            emit-value
            map-options
            :rules="[validarUnidades]"
            :disable="!isAdmin || opcoesUnidades.length === 0"
            hint="Selecione as unidades em que o colaborador atuará."
          />
          <app-form-dependencia-alerta
            v-if="mostrarAlertaUnidades"
            mensagem="Nenhuma unidade cadastrada. Cadastre uma unidade para vincular o colaborador."
            rotulo-acao="Cadastrar unidade"
            :destino="{ name: 'unidades-nova' }"
            @atualizar="recarregarDependencias"
          />

          <q-select
            v-model="form.cargoId"
            :options="opcoesCargos"
            label="Cargo"
            outlined
            clearable
            emit-value
            map-options
            :disable="!isAdmin || opcoesCargos.length === 0"
            hint="Selecione o cargo do colaborador na clínica."
          />
          <app-form-dependencia-alerta
            v-if="mostrarAlertaCargos"
            mensagem="Nenhum cargo cadastrado. Cadastre um cargo para vincular ao colaborador."
            rotulo-acao="Cadastrar cargo"
            :destino="{ name: 'cargos-novo' }"
            @atualizar="recarregarDependencias"
          />

          <q-separator class="q-my-sm" />

          <div class="text-subtitle2 text-weight-medium">Permissões</div>

          <q-toggle
            v-model="form.flagAplicador"
            label="Pode realizar aplicações"
            color="primary"
            :disable="!isAdmin"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!isAdmin || (!form.linkToEmpresa && opcoesUnidades.length === 0)"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped lang="scss">
.funcionario-form__info-banner {
  background: var(--ds-bg-subtle);
  color: var(--ds-text-primary);
}
</style>
