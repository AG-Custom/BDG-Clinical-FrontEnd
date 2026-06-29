<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
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
const podeCriar = usePermissao(permissoes.funcionarios.criar);
const podeEditar = usePermissao(permissoes.funcionarios.editar);
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));

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
  isAdmin: false,
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

const mostrarAlertaCargos = computed(
  () =>
    dadosIniciaisCarregados.value &&
    podeSalvar.value &&
    !form.isAdmin &&
    opcoesCargos.value.length === 0,
);

const mostrarAlertaUnidades = computed(
  () =>
    dadosIniciaisCarregados.value &&
    podeSalvar.value &&
    !form.linkToEmpresa &&
    opcoesUnidades.value.length === 0,
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

function validarCargo(): boolean | string {
  if (form.isAdmin) {
    return true;
  }

  return Boolean(form.cargoId) || 'Selecione o cargo do colaborador';
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
    form.linkToEmpresa = vinculo.linkToEmpresa;
    form.isAdmin = funcionario.isAdmin ?? false;
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
    isAdmin: form.isAdmin,
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

function irParaPermissoesAvancadas(): void {
  if (!funcionarioId.value) {
    return;
  }

  router.push({ name: 'funcionarios-permissoes', params: { id: funcionarioId.value } });
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
            :readonly="!podeSalvar"
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
                :readonly="!podeSalvar"
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
            :readonly="!podeSalvar"
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

          <div class="text-subtitle2 text-weight-medium">Perfil de acesso</div>

          <q-toggle
            v-model="form.isAdmin"
            label="Administrador da empresa"
            color="primary"
            :disable="!podeSalvar"
          />

          <q-banner v-if="!isEdicao && form.isAdmin" dense rounded class="funcionario-form__info-banner">
            <template #avatar>
              <q-icon name="admin_panel_settings" color="primary" />
            </template>
            Como administrador da empresa, o colaborador terá permissão de acesso a todas as
            funcionalidades do sistema, independentemente do cargo.
          </q-banner>

          <q-select
            v-if="!form.isAdmin"
            v-model="form.cargoId"
            class="form-field--required"
            :options="opcoesCargos"
            label="Cargo"
            outlined
            emit-value
            map-options
            :rules="[validarCargo]"
            :disable="!podeSalvar || opcoesCargos.length === 0"
            hint="As permissões base são herdadas do cargo selecionado."
          />
          <app-form-dependencia-alerta
            v-if="mostrarAlertaCargos"
            mensagem="Nenhum cargo cadastrado. Cadastre um cargo para vincular ao colaborador."
            rotulo-acao="Cadastrar cargo"
            :destino="{ name: 'cargos-novo' }"
            @atualizar="recarregarDependencias"
          />

          <div v-if="isEdicao && podeEditar && !form.isAdmin" class="q-mt-sm">
            <q-btn
              flat
              color="primary"
              label="Permissões avançadas"
              icon="tune"
              no-caps
              @click="irParaPermissoesAvancadas"
            />
          </div>

          <q-separator class="q-my-sm" />

          <div class="text-subtitle2 text-weight-medium">Vínculo</div>

          <q-toggle
            v-model="form.linkToEmpresa"
            label="Atua em todas as unidades da empresa"
            color="primary"
            :disable="!podeSalvar"
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
            :disable="!podeSalvar || opcoesUnidades.length === 0"
            hint="Selecione as unidades em que o colaborador atuará."
          />
          <app-form-dependencia-alerta
            v-if="mostrarAlertaUnidades"
            mensagem="Nenhuma unidade cadastrada. Cadastre uma unidade para vincular o colaborador."
            rotulo-acao="Cadastrar unidade"
            :destino="{ name: 'unidades-nova' }"
            @atualizar="recarregarDependencias"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeSalvar || (!form.linkToEmpresa && opcoesUnidades.length === 0)"
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
