<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppEvolutionChart from '@/components/prontuario/AppEvolutionChart.vue';
import AppHistoricoClinico from '@/components/prontuario/AppHistoricoClinico.vue';
import AppEntityAuditSection from '@/components/shared/AppEntityAuditSection.vue';
import { permissoes } from '@/constants/permissoes';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { funcionarioService } from '@/services/funcionario.service';
import { pacienteService } from '@/services/paciente.service';
import { prontuarioService } from '@/services/prontuario.service';
import { unidadeService } from '@/services/unidade.service';
import type { Paciente } from '@/types/entidades/paciente';
import type { Funcionario } from '@/types/entidades/funcionario';
import type { Unidade } from '@/types/entidades/unidade';
import type {
  BodyEvolutionPoint,
  ClinicalEncounter,
  MedicalRecordSummary,
} from '@/types/entidades/prontuario';
import { rotuloStatusAtendimento } from '@/types/entidades/prontuario';
import { formatarDataBrasil, formatarDataHoraBrasil, formatarHoraBrasil } from '@/utils/data-hora';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();
const podeCriar = usePermissao(permissoes.prontuario.criarAtendimento);
const podeEditarPasta = usePermissao(permissoes.prontuario.editarAtendimento);

const pacienteId = computed(() => route.params.id as string);
const paciente = ref<Paciente | null>(null);
const resumo = ref<MedicalRecordSummary | null>(null);
const atendimentos = ref<ClinicalEncounter[]>([]);
const evolucao = ref<BodyEvolutionPoint[]>([]);
const unidades = ref<Unidade[]>([]);
const funcionarios = ref<Funcionario[]>([]);
const carregando = ref(true);
const salvando = ref(false);
const dialogNovo = ref(false);
const dialogPasta = ref(false);

const novo = reactive({
  unidadeId: '',
  funcionarioId: '',
  observacao: '',
});

const pasta = reactive({
  alergias: '',
  alertas: '',
  observacao: '',
});

const pontosPeso = computed(() =>
  evolucao.value.map((ponto) => ({ rotulo: ponto.data, valor: ponto.pesoKg })),
);
const pontosImc = computed(() =>
  evolucao.value.map((ponto) => ({ rotulo: ponto.data, valor: ponto.imc })),
);
const pontosGorda = computed(() =>
  evolucao.value.map((ponto) => ({ rotulo: ponto.data, valor: ponto.percentualMassaGorda })),
);
const pontosMagra = computed(() =>
  evolucao.value.map((ponto) => ({ rotulo: ponto.data, valor: ponto.massaMagraKg })),
);
const pontosAgua = computed(() =>
  evolucao.value.map((ponto) => ({ rotulo: ponto.data, valor: ponto.percentualAgua })),
);
const pontosCintura = computed(() =>
  evolucao.value.map((ponto) => ({ rotulo: ponto.data, valor: ponto.cinturaCm })),
);

function formatarMedida(valor: number | null | undefined, sufixo = ''): string {
  if (valor == null) {
    return '—';
  }

  const texto = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(valor);
  return sufixo ? `${texto} ${sufixo}` : texto;
}

function tomClassificacaoImc(classificacao: string | null | undefined): 'neutro' | 'ok' | 'alerta' | 'risco' {
  if (!classificacao) {
    return 'neutro';
  }

  const texto = classificacao.toLocaleLowerCase('pt-BR');

  if (texto.includes('adequado')) {
    return 'ok';
  }

  if (texto.includes('obesidade')) {
    return 'risco';
  }

  if (texto.includes('baixo') || texto.includes('sobrepeso')) {
    return 'alerta';
  }

  return 'neutro';
}

const painelClinico = computed(() => {
  const atual = resumo.value;
  const avaliacao = atual?.ultimaAvaliacao ?? null;
  const proximo = atual?.proximoAgendamento ?? null;

  return {
    sexo: atual?.prontuario.pacienteSexo || '—',
    idade: atual?.prontuario.pacienteIdade != null ? `${atual.prontuario.pacienteIdade} anos` : '—',
    nascimento: atual?.prontuario.pacienteDataNascimento
      ? formatarDataBrasil(atual.prontuario.pacienteDataNascimento)
      : '—',
    peso: formatarMedida(avaliacao?.pesoKg, 'kg'),
    imc: formatarMedida(avaliacao?.imc),
    classificacao: avaliacao?.classificacaoImc || '—',
    tom: tomClassificacaoImc(avaliacao?.classificacaoImc),
    alergias: atual?.prontuario.alergias?.trim() || '',
    alertas: atual?.prontuario.alertas?.trim() || '',
    observacao: atual?.prontuario.observacao?.trim() || '',
    proximo: proximo
      ? `${formatarDataBrasil(proximo.dataInicio)} · ${formatarHoraBrasil(proximo.dataInicio)}`
      : '—',
    proximoDetalhe: proximo
      ? [proximo.tipo, proximo.funcionarioNome].filter(Boolean).join(' · ')
      : 'Nenhum agendamento futuro',
    atendimentos: String(atendimentos.value.length),
  };
});

const listaAtendimentos = computed(() =>
  atendimentos.value.map((item) => ({
    id: item.id,
    data: formatarDataBrasil(item.dataInicio),
    hora: formatarHoraBrasil(item.dataInicio),
    profissional: item.funcionarioNome,
    unidade: item.unidadeNome,
    status: rotuloStatusAtendimento(item.status),
    emAndamento: item.status === 'EmAndamento',
    origem: item,
  })),
);

async function carregar(): Promise<void> {
  carregando.value = true;
  try {
    const [pacienteAtual, resumoAtual, lista, pontos, listaUnidades, listaFuncionarios] =
      await Promise.all([
        pacienteService.obter(pacienteId.value),
        prontuarioService.obterResumo(pacienteId.value),
        prontuarioService.listarAtendimentos(pacienteId.value),
        prontuarioService.obterEvolucao(pacienteId.value),
        unidadeService.listar(false),
        funcionarioService.listar(),
      ]);

    paciente.value = pacienteAtual;
    resumo.value = resumoAtual;
    atendimentos.value = lista;
    evolucao.value = pontos;
    unidades.value = listaUnidades;
    funcionarios.value = listaFuncionarios;
    pasta.alergias = resumoAtual.prontuario.alergias ?? '';
    pasta.alertas = resumoAtual.prontuario.alertas ?? '';
    pasta.observacao = resumoAtual.prontuario.observacao ?? '';
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

function abrirNovo(): void {
  novo.unidadeId = paciente.value?.unidadeId ?? unidades.value[0]?.id ?? '';
  novo.funcionarioId = funcionarios.value[0]?.id ?? '';
  novo.observacao = '';
  if (atendimentos.value.some((item) => item.status === 'EmAndamento')) {
    notificacao.info('Já existe um atendimento em andamento. Você pode abrir outro se precisar.');
  }
  dialogNovo.value = true;
}

async function criarAtendimento(): Promise<void> {
  salvando.value = true;
  try {
    const criado = await prontuarioService.criarAtendimento(pacienteId.value, {
      unidadeId: novo.unidadeId,
      funcionarioId: novo.funcionarioId,
      observacao: novo.observacao || undefined,
    });
    dialogNovo.value = false;
    notificacao.sucesso('Atendimento iniciado.');
    await router.push({
      name: 'pacientes-prontuario-atendimento',
      params: { id: pacienteId.value, atendimentoId: criado.id },
    });
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

async function salvarPasta(): Promise<void> {
  salvando.value = true;
  try {
    await prontuarioService.atualizarPasta(pacienteId.value, {
      alergias: pasta.alergias || null,
      alertas: pasta.alertas || null,
      observacao: pasta.observacao || null,
    });
    dialogPasta.value = false;
    notificacao.sucesso('Prontuário atualizado.');
    await carregar();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function abrirAtendimento(item: ClinicalEncounter): void {
  void router.push({
    name: 'pacientes-prontuario-atendimento',
    params: { id: pacienteId.value, atendimentoId: item.id },
  });
}

onMounted(() => {
  void carregar();
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Prontuário"
      :subtitulo="paciente ? `Histórico clínico de ${paciente.nome}.` : 'Histórico clínico do paciente.'"
    >
      <q-btn
        flat
        color="primary"
        icon="arrow_back"
        label="Pacientes"
        no-caps
        @click="router.push({ name: 'pacientes' })"
      />
      <q-btn
        v-if="podeCriar"
        unelevated
        color="primary"
        label="Novo atendimento"
        icon="add"
        no-caps
        @click="abrirNovo"
      />
    </app-page-header>

    <q-card v-if="carregando && !resumo" flat bordered class="q-mt-md">
      <q-card-section>
        <app-table-skeleton :columns="4" />
      </q-card-section>
    </q-card>

    <template v-else-if="resumo">
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row items-center no-wrap q-mb-md">
            <div>
              <div class="secao-titulo secao-titulo--inline">Resumo clínico</div>
              <div class="pasta-meta">
                {{ painelClinico.sexo }} · {{ painelClinico.idade }} · nasc. {{ painelClinico.nascimento }}
              </div>
            </div>
            <q-space />
            <q-btn
              v-if="podeEditarPasta"
              flat
              dense
              color="primary"
              icon="edit"
              label="Editar alergias"
              no-caps
              @click="dialogPasta = true"
            />
          </div>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6 col-md-3">
              <div class="pasta-metrica">
                <span>Peso atual</span>
                <strong>{{ painelClinico.peso }}</strong>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="pasta-metrica" :class="`pasta-metrica--${painelClinico.tom}`">
                <span>IMC</span>
                <strong>{{ painelClinico.imc }}</strong>
                <em>{{ painelClinico.classificacao }}</em>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="pasta-metrica">
                <span>Próximo agendamento</span>
                <strong>{{ painelClinico.proximo }}</strong>
                <em>{{ painelClinico.proximoDetalhe }}</em>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="pasta-metrica">
                <span>Atendimentos</span>
                <strong>{{ painelClinico.atendimentos }}</strong>
              </div>
            </div>
          </div>

          <div class="pasta-alertas">
            <div class="pasta-alerta" :class="{ 'pasta-alerta--risco': painelClinico.alergias }">
              <span>Alergias</span>
              <strong>{{ painelClinico.alergias || 'Nenhuma registrada' }}</strong>
            </div>
            <div class="pasta-alerta" :class="{ 'pasta-alerta--alerta': painelClinico.alertas }">
              <span>Alertas</span>
              <strong>{{ painelClinico.alertas || 'Nenhum registrado' }}</strong>
            </div>
            <div v-if="painelClinico.observacao" class="pasta-alerta">
              <span>Observação clínica</span>
              <strong>{{ painelClinico.observacao }}</strong>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-card flat bordered class="pasta-card-lista">
            <q-card-section>
              <div class="secao-titulo">Pacotes ativos</div>
              <p v-if="resumo.pacotesAtivos.length === 0" class="pasta-vazio">Nenhum pacote ativo.</p>
              <div v-else class="pasta-lista">
                <div v-for="pacote in resumo.pacotesAtivos" :key="pacote.id" class="pasta-lista__item">
                  <strong>{{ pacote.pacoteNome }}</strong>
                  <span>Compra em {{ formatarDataHoraBrasil(pacote.dataCompra) }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <q-card flat bordered class="pasta-card-lista">
            <q-card-section>
              <div class="secao-titulo">Últimas aplicações</div>
              <p v-if="resumo.ultimasAplicacoes.length === 0" class="pasta-vazio">Nenhuma aplicação registrada.</p>
              <div v-else class="pasta-lista">
                <div v-for="aplicacao in resumo.ultimasAplicacoes" :key="aplicacao.id" class="pasta-lista__item">
                  <strong>{{ aplicacao.procedimentoNome || aplicacao.produtoNome || 'Aplicação' }}</strong>
                  <span>{{ formatarDataHoraBrasil(aplicacao.dataAplicacao) }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="secao-titulo">Evolução corporal</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6 col-md-4">
              <app-evolution-chart titulo="Peso" :pontos="pontosPeso" />
            </div>
            <div class="col-12 col-sm-6 col-md-4">
              <app-evolution-chart titulo="IMC" :pontos="pontosImc" />
            </div>
            <div class="col-12 col-sm-6 col-md-4">
              <app-evolution-chart titulo="% massa gorda" :pontos="pontosGorda" />
            </div>
            <div class="col-12 col-sm-6 col-md-4">
              <app-evolution-chart titulo="Massa magra (kg)" :pontos="pontosMagra" />
            </div>
            <div class="col-12 col-sm-6 col-md-4">
              <app-evolution-chart titulo="% água" :pontos="pontosAgua" />
            </div>
            <div class="col-12 col-sm-6 col-md-4">
              <app-evolution-chart titulo="Cintura (cm)" :pontos="pontosCintura" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="secao-titulo">
            Linha do tempo
            <span v-if="resumo.timeline.length" class="secao-titulo__contagem">
              {{ resumo.timeline.length }}
            </span>
          </div>
          <app-historico-clinico
            :eventos="resumo.timeline"
            vazio-titulo="Nenhum evento clínico"
            vazio-texto="Avaliações, anotações e atendimentos passam a aparecer nesta linha do tempo."
          />
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="secao-titulo">
            Atendimentos
            <span v-if="listaAtendimentos.length" class="secao-titulo__contagem">
              {{ listaAtendimentos.length }}
            </span>
          </div>
          <app-empty-state
            v-if="listaAtendimentos.length === 0"
            icon="assignment"
            titulo="Nenhum atendimento"
            texto="Inicie o primeiro atendimento clínico deste paciente."
          />
          <div v-else class="pasta-atendimentos">
            <article
              v-for="item in listaAtendimentos"
              :key="item.id"
              class="pasta-atendimento"
            >
              <div>
                <div class="pasta-atendimento__data">{{ item.data }}</div>
                <div class="pasta-atendimento__meta">
                  {{ item.hora }} · {{ item.profissional }} · {{ item.unidade }}
                </div>
              </div>
              <div class="pasta-atendimento__acoes">
                <span
                  class="pasta-atendimento__status"
                  :class="{ 'pasta-atendimento__status--ativo': item.emAndamento }"
                >
                  {{ item.status }}
                </span>
                <q-btn
                  flat
                  dense
                  color="primary"
                  no-caps
                  label="Abrir"
                  @click="abrirAtendimento(item.origem)"
                />
              </div>
            </article>
          </div>
        </q-card-section>
      </q-card>

      <q-card v-if="resumo.prontuario.id" flat bordered>
        <q-card-section>
          <app-entity-audit-section
            :ativo="true"
            :registro-id="resumo.prontuario.id"
            entidade-auditoria="Prontuario"
            :criado-em="resumo.prontuario.criadoEm"
            :atualizado-em="resumo.prontuario.atualizadoEm"
            mostrar-titulo-secao
          />
        </q-card-section>
      </q-card>
    </template>

    <q-dialog v-model="dialogNovo" transition-show="none" transition-hide="none">
      <q-card style="min-width: 320px; max-width: 560px; width: 90vw">
        <q-card-section>
          <div class="text-h6">Novo atendimento</div>
        </q-card-section>
        <q-card-section>
          <q-form class="form-stack" @submit.prevent="criarAtendimento">
            <q-select
              v-model="novo.unidadeId"
              class="form-field--required"
              :options="unidades"
              option-label="nome"
              option-value="id"
              emit-value
              map-options
              label="Unidade"
              outlined
              :rules="[(value: string) => Boolean(value) || 'Selecione a unidade']"
            />
            <q-select
              v-model="novo.funcionarioId"
              class="form-field--required"
              :options="funcionarios"
              option-label="nome"
              option-value="id"
              emit-value
              map-options
              label="Profissional"
              outlined
              :rules="[(value: string) => Boolean(value) || 'Selecione o profissional']"
            />
            <q-input v-model="novo.observacao" type="textarea" outlined label="Observação" autogrow />
          </q-form>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" no-caps v-close-popup />
          <q-btn unelevated color="primary" label="Iniciar" no-caps :disable="salvando" @click="criarAtendimento" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogPasta" transition-show="none" transition-hide="none">
      <q-card style="min-width: 320px; max-width: 560px; width: 90vw">
        <q-card-section>
          <div class="text-h6">Alergias e alertas</div>
        </q-card-section>
        <q-card-section>
          <q-form class="form-stack" @submit.prevent="salvarPasta">
            <q-input v-model="pasta.alergias" type="textarea" outlined label="Alergias" autogrow />
            <q-input v-model="pasta.alertas" type="textarea" outlined label="Alertas" autogrow />
            <q-input v-model="pasta.observacao" type="textarea" outlined label="Observação clínica" autogrow />
          </q-form>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" no-caps v-close-popup />
          <q-btn unelevated color="primary" label="Salvar" no-caps :disable="salvando" @click="salvarPasta" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped lang="scss">
.secao-titulo {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  font-weight: var(--ds-font-weight-medium);
  margin-bottom: var(--ds-space-3);
}

.secao-titulo--inline {
  margin-bottom: 0;
}

.secao-titulo__contagem {
  display: inline-flex;
  min-width: 1.5rem;
  justify-content: center;
  padding: 0 var(--ds-space-2);
  border-radius: var(--ds-radius-full);
  background: var(--ds-bg-subtle);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-xs);
  font-weight: var(--ds-font-weight-semibold);
}

.pasta-meta {
  margin-top: var(--ds-space-1);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
}

.pasta-metrica {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-height: 84px;
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-page);

  span {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-xs);
    font-weight: var(--ds-font-weight-medium);
    letter-spacing: var(--ds-letter-spacing-wide);
  }

  strong {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-sm);
    font-weight: var(--ds-font-weight-semibold);
    line-height: var(--ds-line-height-tight);
  }

  em {
    color: var(--ds-text-muted);
    font-size: var(--ds-font-size-xs);
    font-style: normal;
  }
}

.pasta-metrica--ok strong {
  color: var(--ds-color-success-600);
}

.pasta-metrica--alerta strong {
  color: var(--ds-color-warning-600);
}

.pasta-metrica--risco strong {
  color: var(--ds-color-error-600);
}

.pasta-alertas {
  display: grid;
  gap: var(--ds-space-2);
}

.pasta-alerta {
  display: grid;
  gap: var(--ds-space-1);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-page);

  span {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-xs);
    font-weight: var(--ds-font-weight-medium);
    letter-spacing: var(--ds-letter-spacing-wide);
  }

  strong {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-sm);
  }
}

.pasta-alerta--risco {
  background: var(--ds-color-error-50);
  border-color: var(--ds-color-error-50);

  span,
  strong {
    color: var(--ds-color-error-600);
  }
}

.pasta-alerta--alerta {
  background: var(--ds-color-warning-50);
  border-color: var(--ds-color-warning-50);

  span,
  strong {
    color: var(--ds-color-warning-600);
  }
}

.pasta-vazio {
  margin: 0;
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
}

.pasta-card-lista {
  height: 100%;
}

.pasta-lista {
  display: grid;
  gap: var(--ds-space-2);
}

.pasta-lista__item {
  display: grid;
  gap: var(--ds-space-1);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-page);

  strong {
    color: var(--ds-text-primary);
    font-size: var(--ds-font-size-sm);
  }

  span {
    color: var(--ds-text-secondary);
    font-size: var(--ds-font-size-xs);
  }
}

.pasta-atendimentos {
  display: grid;
  gap: var(--ds-space-2);
}

.pasta-atendimento {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-page);
}

.pasta-atendimento__data {
  color: var(--ds-text-primary);
  font-weight: var(--ds-font-weight-semibold);
}

.pasta-atendimento__meta {
  margin-top: var(--ds-space-1);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
}

.pasta-atendimento__acoes {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  flex-shrink: 0;
}

.pasta-atendimento__status {
  padding: 0 var(--ds-space-2);
  border-radius: var(--ds-radius-full);
  background: var(--ds-bg-subtle);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-xs);
  font-weight: var(--ds-font-weight-medium);
}

.pasta-atendimento__status--ativo {
  background: var(--ds-color-success-50);
  color: var(--ds-color-success-600);
}
</style>
