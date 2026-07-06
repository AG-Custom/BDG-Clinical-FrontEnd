<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { permissoes } from '@/constants/permissoes';
import { usePermissao } from '@/composables/usePermissao';
import { useNotificacao } from '@/composables/useNotificacao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { pacienteService } from '@/services/paciente.service';
import { unidadeService } from '@/services/unidade.service';
import { normalizarCpf, obterUnidadeIdsDoPaciente } from '@/types/entidades/paciente';
import type { Unidade } from '@/types/entidades/unidade';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.pacientes.criar);
const podeEditar = usePermissao(permissoes.pacientes.editar);
const podeSalvar = computed(() => (isEdicao.value ? podeEditar.value : podeCriar.value));

const carregando = ref(false);
const salvando = ref(false);
const unidadesDisponiveis = ref<Unidade[]>([]);
const dadosIniciaisCarregados = ref(false);

const isEdicao = computed(() => route.name === 'pacientes-editar');
const pacienteId = computed(() => route.params.id as string | undefined);

const form = reactive({
  unidadeIds: [] as string[],
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  dataNascimento: '',
  observacao: '',
});

const opcoesUnidades = computed(() =>
  unidadesDisponiveis.value.map((unidade) => ({
    label: unidade.ativo ? unidade.nome : `${unidade.nome} (inativa)`,
    value: unidade.id,
  })),
);

const mostrarAlertaUnidades = computed(
  () => dadosIniciaisCarregados.value && podeSalvar.value && opcoesUnidades.value.length === 0,
);

function validarEmail(value: string): boolean | string {
  if (!value) {
    return true;
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return emailValido || 'Informe um e-mail válido';
}

function validarCpf(value: string): boolean | string {
  if (!value) {
    return true;
  }

  const digitos = value.replace(/\D/g, '');

  return digitos.length === 11 || 'Informe um CPF válido com 11 dígitos';
}

function validarUnidades(value: string[] | null): boolean | string {
  return (Array.isArray(value) && value.length > 0) || 'Selecione ao menos uma unidade';
}

function montarPayload() {
  return {
    unidadeIds: form.unidadeIds,
    nome: form.nome.trim(),
    cpf: normalizarCpf(form.cpf),
    telefone: form.telefone.trim() || null,
    email: form.email.trim() || null,
    dataNascimento: form.dataNascimento || null,
    observacao: form.observacao.trim() || null,
  };
}

async function carregarUnidades(): Promise<void> {
  try {
    unidadesDisponiveis.value = await unidadeService.listar(false);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    dadosIniciaisCarregados.value = true;
  }
}

async function recarregarDependencias(): Promise<void> {
  await carregarUnidades();
}

async function garantirUnidadesNaLista(unidadeIds: string[]): Promise<void> {
  const faltantes = unidadeIds.filter(
    (unidadeId) => !unidadesDisponiveis.value.some((unidade) => unidade.id === unidadeId),
  );

  if (faltantes.length === 0) {
    return;
  }

  try {
    const unidades = await Promise.all(faltantes.map((id) => unidadeService.obter(id)));
    unidadesDisponiveis.value = [...unidades, ...unidadesDisponiveis.value];
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

async function carregarPaciente(): Promise<void> {
  if (!isEdicao.value || !pacienteId.value) {
    return;
  }

  carregando.value = true;

  try {
    const paciente = await pacienteService.obter(pacienteId.value);

    form.unidadeIds = obterUnidadeIdsDoPaciente(paciente);
    form.nome = paciente.nome;
    form.cpf = paciente.cpf ?? '';
    form.telefone = paciente.telefone ?? '';
    form.email = paciente.email ?? '';
    form.dataNascimento = paciente.dataNascimento ?? '';
    form.observacao = paciente.observacao ?? '';

    await garantirUnidadesNaLista(form.unidadeIds);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
    await router.push({ name: 'pacientes' });
  } finally {
    carregando.value = false;
  }
}

async function salvar(): Promise<void> {
  salvando.value = true;

  try {
    const payload = montarPayload();

    if (isEdicao.value && pacienteId.value) {
      await pacienteService.atualizar(pacienteId.value, payload);
      notificacao.sucesso('Paciente atualizado com sucesso.');
    } else {
      await pacienteService.criar(payload);
      notificacao.sucesso('Paciente cadastrado com sucesso.');
    }

    await router.push({ name: 'pacientes' });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function cancelar(): void {
  router.push({ name: 'pacientes' });
}

onMounted(async () => {
  await carregarUnidades();
  await carregarPaciente();
});
</script>

<template>
  <q-page class="page-content page-content--form q-pa-md">
    <app-page-header
      :titulo="isEdicao ? 'Editar paciente' : 'Novo paciente'"
      :subtitulo="
        isEdicao
          ? 'Atualize os dados do paciente.'
          : 'Cadastre um novo paciente vinculado às unidades da clínica.'
      "
    />

    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="carregando" />

        <q-form class="form-stack" @submit.prevent="salvar">
          <app-form-dependencia-alerta
            v-if="mostrarAlertaUnidades"
            mensagem="Nenhuma unidade cadastrada. Cadastre uma unidade antes de registrar o paciente."
            rotulo-acao="Cadastrar unidade"
            :destino="{ name: 'unidades-nova' }"
            @atualizar="recarregarDependencias"
          />

          <q-select
            v-model="form.unidadeIds"
            class="form-field--required"
            :options="opcoesUnidades"
            label="Unidades"
            outlined
            multiple
            use-chips
            emit-value
            map-options
            :rules="[validarUnidades]"
            :disable="!podeSalvar || opcoesUnidades.length === 0"
            hint="Unidades em que o paciente pode ser atendido."
          />

          <q-input
            v-model="form.nome"
            class="form-field--required"
            label="Nome completo"
            outlined
            :readonly="!podeSalvar"
            :rules="[(value: string) => Boolean(value?.trim()) || 'Informe o nome do paciente']"
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.cpf"
                label="CPF"
                outlined
                mask="###.###.###-##"
                unmasked-value
                fill-mask
                :readonly="!podeSalvar"
                :rules="[validarCpf]"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.dataNascimento"
                label="Data de nascimento"
                outlined
                type="date"
                :readonly="!podeSalvar"
              />
            </div>
          </div>

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
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.email"
                label="E-mail"
                type="email"
                outlined
                :readonly="!podeSalvar"
                :rules="[validarEmail]"
              />
            </div>
          </div>

          <q-input
            v-model="form.observacao"
            label="Observação"
            outlined
            type="textarea"
            autogrow
            :readonly="!podeSalvar"
          />

          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              unelevated
              no-caps
              :loading="salvando"
              :disable="!podeSalvar || opcoesUnidades.length === 0"
            />
            <q-btn flat label="Cancelar" color="primary" no-caps @click="cancelar" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
