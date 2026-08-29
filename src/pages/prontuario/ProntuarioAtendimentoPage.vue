<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppAnamneseCampo from '@/components/prontuario/AppAnamneseCampo.vue';
import AppHistoricoClinico from '@/components/prontuario/AppHistoricoClinico.vue';
import AppEntityAuditSection from '@/components/shared/AppEntityAuditSection.vue';
import { permissoes } from '@/constants/permissoes';
import { useNotificacao } from '@/composables/useNotificacao';
import { usePermissao } from '@/composables/usePermissao';
import { useTratarErroFormulario } from '@/composables/useTratarErroFormulario';
import { prontuarioService } from '@/services/prontuario.service';
import type {
  AnamneseField,
  AnamneseRecord,
  AnamneseTemplate,
  Bioimpedancia,
  BodyAssessment,
  Circunferencias,
  ClinicalAttachment,
  ClinicalEncounter,
  ClinicalNote,
  ComparativePhoto,
  EnergyCalculation,
  PocketRule,
  Pregas,
} from '@/types/entidades/prontuario';
import {
  CATEGORIAS_DOCUMENTO,
  CATEGORIAS_EXAME,
  CATEGORIAS_FOTO,
  OPCOES_NIVEL_ATIVIDADE,
  OPCOES_OBJETIVO_BOLSO,
  OPCOES_PERFIL_VENTA,
  OPCOES_PROTOCOLO_VENTA,
  TIPOS_ANOTACAO,
  rotuloStatusAtendimento,
} from '@/types/entidades/prontuario';
import { formatarDataBrasil, formatarDataHoraBrasil, formatarHoraBrasil } from '@/utils/data-hora';

const route = useRoute();
const router = useRouter();
const notificacao = useNotificacao();
const { obterMensagem } = useTratarErroFormulario();

const podeEditar = usePermissao(permissoes.prontuario.editarAtendimento);
const podeAnotacao = usePermissao(permissoes.prontuario.criarAnotacao);
const podeAnamnese = usePermissao(permissoes.prontuario.editarAnamnese);
const podeAvaliacao = usePermissao(permissoes.prontuario.criarAvaliacao);
const podeExame = usePermissao(permissoes.prontuario.enviarExame);
const podeFoto = usePermissao(permissoes.prontuario.enviarFoto);
const podeDocumento = usePermissao(permissoes.prontuario.editarDocumento);

const pacienteId = computed(() => route.params.id as string);
const atendimentoId = computed(() => route.params.atendimentoId as string);
const aba = ref('resumo');
const carregando = ref(true);
const salvando = ref(false);

const atendimento = ref<ClinicalEncounter | null>(null);
const anotacoes = ref<ClinicalNote[]>([]);
const modelos = ref<AnamneseTemplate[]>([]);
const anamneses = ref<AnamneseRecord[]>([]);
const avaliacoes = ref<BodyAssessment[]>([]);
const exames = ref<ClinicalAttachment[]>([]);
const documentos = ref<ClinicalAttachment[]>([]);
const fotos = ref<ComparativePhoto[]>([]);
const ventas = ref<EnergyCalculation[]>([]);
const regras = ref<PocketRule[]>([]);
const fotosPaciente = ref<ComparativePhoto[]>([]);

const nota = reactive({ tipo: 'Evolucao', texto: '' });
const modeloId = ref<string | null>(null);
const respostas = ref<Record<string, string | number | boolean | string[] | null>>({});
const anamneseAtual = computed(
  () =>
    anamneses.value.find((item) => item.modeloAnamneseId === modeloId.value) ??
    anamneses.value[0] ??
    null,
);

const camposAnamnese = computed<AnamneseField[]>(() => {
  const modelo = modelos.value.find((item) => item.id === modeloId.value);
  if (modelo) {
    return modelo.campos;
  }
  const atual = anamneseAtual.value;
  if (!atual) {
    return [];
  }
  try {
    return JSON.parse(atual.schemaSnapshotJson) as AnamneseField[];
  } catch {
    return [];
  }
});

const fotosComparacao = computed(() =>
  fotosPaciente.value.map((item) => ({
    id: item.id,
    rotulo: `${item.categoria} · ${formatarDataHoraBrasil(item.dataCaptura)}`,
  })),
);

const camposCircunferencia: { chave: keyof Circunferencias; label: string }[] = [
  { chave: 'pescoco', label: 'Pescoço' },
  { chave: 'ombro', label: 'Ombro' },
  { chave: 'torax', label: 'Tórax' },
  { chave: 'abdomen', label: 'Abdômen' },
  { chave: 'cintura', label: 'Cintura' },
  { chave: 'quadril', label: 'Quadril' },
  { chave: 'bracoDireitoRelaxado', label: 'Braço D relaxado' },
  { chave: 'bracoEsquerdoRelaxado', label: 'Braço E relaxado' },
  { chave: 'coxaDireita', label: 'Coxa D' },
  { chave: 'coxaEsquerda', label: 'Coxa E' },
  { chave: 'panturrilhaDireita', label: 'Panturrilha D' },
  { chave: 'panturrilhaEsquerda', label: 'Panturrilha E' },
];

const camposPrega: { chave: keyof Pregas; label: string }[] = [
  { chave: 'axilarMedia', label: 'Axilar média' },
  { chave: 'triceps', label: 'Tríceps' },
  { chave: 'subescapular', label: 'Subescapular' },
  { chave: 'supraIliaca', label: 'Supra-ilíaca' },
  { chave: 'torax', label: 'Tórax' },
  { chave: 'abdominal', label: 'Abdominal' },
  { chave: 'coxa', label: 'Coxa' },
];

const avaliacaoEditandoId = ref<string | null>(null);
const avaliacao = reactive({
  alturaCm: null as number | null,
  pesoKg: null as number | null,
  cinturaCm: null as number | null,
  quadrilCm: null as number | null,
  protocoloPrega: null as string | null,
  observacao: '',
});
const bioimpedancia = reactive<Bioimpedancia>({});
const circunferencias = reactive<Circunferencias>({});
const pregas = reactive<Pregas>({});

const anexo = reactive({ nome: '', categoria: 'Laboratorial', observacao: '' });
const arquivoExame = ref<File | File[] | null>(null);
const arquivoDocumento = ref<File | File[] | null>(null);
const documento = reactive({ nome: '', categoria: 'Diversos', observacao: '' });
const foto = reactive({ categoria: 'Frente', observacao: '' });
const arquivoFoto = ref<File | File[] | null>(null);
const comparativo = reactive({ esquerdaId: '', direitaId: '' });
const comparacao = ref<{ esquerda: ComparativePhoto; direita: ComparativePhoto } | null>(null);

const venta = reactive({
  perfil: 'Adulto',
  protocolo: 'MifflinStJeor',
  nivelAtividade: 'Moderado',
  pesoKg: null as number | null,
  alturaCm: null as number | null,
  pesoDesejadoKg: null as number | null,
  tempoDias: 30,
  fatorInjuria: null as number | null,
});
const regra = reactive({ objetivo: 'Manutencao' });

const ultimaAvaliacao = computed(() => avaliacoes.value[0] ?? null);
const ultimaVenta = computed(() => ventas.value[0] ?? null);

const resumoNutricao = computed(() => {
  const peso = venta.pesoKg ?? ultimaAvaliacao.value?.pesoKg ?? null;
  const altura = venta.alturaCm ?? ultimaAvaliacao.value?.alturaCm ?? null;
  const gasto = ultimaVenta.value?.gastoEnergeticoTotal ?? null;

  return {
    peso,
    altura,
    gasto,
    podeCalcularVenta: peso != null && altura != null,
    podeCalcularMacros: peso != null && gasto != null,
  };
});

const protocolosPrega = [
  { label: 'Jackson & Pollock 7 pregas', value: 'JacksonPollock7' },
  { label: 'Jackson & Pollock 3 pregas', value: 'JacksonPollock3' },
];

async function carregar(): Promise<void> {
  carregando.value = true;
  try {
    const [enc, notes, mods, anams, avals, exams, docs, phs, vnts, rgs, allPhotos] = await Promise.all([
      prontuarioService.obterAtendimento(atendimentoId.value),
      prontuarioService.listarAnotacoes(atendimentoId.value),
      prontuarioService.listarModelosAnamnese(),
      prontuarioService.listarAnamneses(atendimentoId.value),
      prontuarioService.listarAvaliacoes(atendimentoId.value),
      prontuarioService.listarAnexos(atendimentoId.value, 'Exame'),
      prontuarioService.listarAnexos(atendimentoId.value, 'Documento'),
      prontuarioService.listarFotos(atendimentoId.value),
      prontuarioService.listarVenta(atendimentoId.value),
      prontuarioService.listarRegraBolso(atendimentoId.value),
      prontuarioService.listarFotosPaciente(pacienteId.value),
    ]);
    atendimento.value = enc;
    anotacoes.value = notes;
    modelos.value = mods;
    anamneses.value = anams;
    avaliacoes.value = avals;
    exames.value = exams;
    documentos.value = docs;
    fotos.value = phs;
    ventas.value = vnts;
    regras.value = rgs;
    fotosPaciente.value = allPhotos;

    preencherVentaDaAvaliacao(avals[0] ?? null);

    const ultimaAnamnese = anams[0];
    if (ultimaAnamnese) {
      modeloId.value = ultimaAnamnese.modeloAnamneseId;
      try {
        respostas.value = JSON.parse(ultimaAnamnese.respostasJson) as Record<
          string,
          string | number | boolean | string[] | null
        >;
      } catch {
        respostas.value = {};
      }
    }
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    carregando.value = false;
  }
}

async function finalizar(): Promise<void> {
  salvando.value = true;
  try {
    atendimento.value = await prontuarioService.finalizarAtendimento(atendimentoId.value);
    notificacao.sucesso('Atendimento finalizado. A edição continua disponível.');
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

async function salvarNota(): Promise<void> {
  salvando.value = true;
  try {
    await prontuarioService.criarAnotacao(atendimentoId.value, { tipo: nota.tipo, texto: nota.texto });
    nota.texto = '';
    notificacao.sucesso('Anotação registrada.');
    anotacoes.value = await prontuarioService.listarAnotacoes(atendimentoId.value);
    atendimento.value = await prontuarioService.obterAtendimento(atendimentoId.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

async function salvarAnamnese(): Promise<void> {
  if (!modeloId.value) {
    notificacao.erro('Selecione um modelo de anamnese.');
    return;
  }
  salvando.value = true;
  try {
    const payload = { modeloAnamneseId: modeloId.value, respostasJson: JSON.stringify(respostas.value) };
    const atual = anamneses.value.find((item) => item.modeloAnamneseId === modeloId.value);
    if (atual) {
      await prontuarioService.atualizarAnamnese(atual.id, {
        respostasJson: payload.respostasJson,
        resumoAlteracao: 'Atualização das respostas',
      });
    } else {
      await prontuarioService.criarAnamnese(atendimentoId.value, payload);
    }
    notificacao.sucesso('Anamnese salva.');
    anamneses.value = await prontuarioService.listarAnamneses(atendimentoId.value);
    atendimento.value = await prontuarioService.obterAtendimento(atendimentoId.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

async function salvarAvaliacao(): Promise<void> {
  salvando.value = true;
  try {
    const payload = {
      alturaCm: avaliacao.alturaCm,
      pesoKg: avaliacao.pesoKg,
      cinturaCm: avaliacao.cinturaCm ?? circunferencias.cintura ?? null,
      quadrilCm: avaliacao.quadrilCm ?? circunferencias.quadril ?? null,
      protocoloPrega: avaliacao.protocoloPrega,
      observacao: avaliacao.observacao || null,
      bioimpedancia: { ...bioimpedancia },
      circunferencias: {
        ...circunferencias,
        cintura: circunferencias.cintura ?? avaliacao.cinturaCm,
        quadril: circunferencias.quadril ?? avaliacao.quadrilCm,
      },
      pregas: { ...pregas },
    };

    if (avaliacaoEditandoId.value) {
      await prontuarioService.atualizarAvaliacao(avaliacaoEditandoId.value, payload);
      notificacao.sucesso('Avaliação corrigida. O histórico anterior permanece.');
    } else {
      await prontuarioService.criarAvaliacao(atendimentoId.value, payload);
      notificacao.sucesso('Avaliação corporal registrada.');
    }

    avaliacoes.value = await prontuarioService.listarAvaliacoes(atendimentoId.value);
    preencherVentaDaAvaliacao(avaliacoes.value[0] ?? null);
    novaAvaliacao();
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

function arquivoUnico(valor: File | File[] | null): File | null {
  if (!valor) {
    return null;
  }

  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function novaAvaliacao(): void {
  avaliacaoEditandoId.value = null;
  avaliacao.alturaCm = null;
  avaliacao.pesoKg = null;
  avaliacao.cinturaCm = null;
  avaliacao.quadrilCm = null;
  avaliacao.protocoloPrega = null;
  avaliacao.observacao = '';
  Object.keys(bioimpedancia).forEach((chave) => {
    bioimpedancia[chave as keyof Bioimpedancia] = null;
  });
  Object.keys(circunferencias).forEach((chave) => {
    circunferencias[chave as keyof Circunferencias] = null;
  });
  Object.keys(pregas).forEach((chave) => {
    pregas[chave as keyof Pregas] = null;
  });
}

function preencherAvaliacao(item: BodyAssessment): void {
  avaliacaoEditandoId.value = item.id;
  avaliacao.alturaCm = item.alturaCm;
  avaliacao.pesoKg = item.pesoKg;
  avaliacao.cinturaCm = item.cinturaCm;
  avaliacao.quadrilCm = item.quadrilCm;
  avaliacao.protocoloPrega = item.protocoloPrega;
  avaliacao.observacao = item.observacao ?? '';
  Object.assign(bioimpedancia, item.bioimpedancia ?? {});
  Object.assign(circunferencias, item.circunferencias ?? {});
  Object.assign(pregas, item.pregas ?? {});
}

type TomClassificacaoImc = 'neutro' | 'ok' | 'alerta' | 'risco';

function formatarMedidaAvaliacao(valor: number | null, sufixo = ''): string {
  if (valor == null) {
    return '—';
  }

  const texto = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(valor);
  return sufixo ? `${texto} ${sufixo}` : texto;
}

function tomClassificacaoImc(classificacao: string | null): TomClassificacaoImc {
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

const historicoAvaliacoes = computed(() =>
  avaliacoes.value.map((item) => ({
    id: item.id,
    data: formatarDataBrasil(item.dataAvaliacao),
    hora: formatarHoraBrasil(item.dataAvaliacao),
    profissional: item.funcionarioNome,
    peso: formatarMedidaAvaliacao(item.pesoKg, 'kg'),
    imc: formatarMedidaAvaliacao(item.imc),
    classificacao: item.classificacaoImc || '—',
    tom: tomClassificacaoImc(item.classificacaoImc),
    pesoIdeal: item.pesoIdealKg ? formatarMedidaAvaliacao(item.pesoIdealKg, 'kg') : null,
    altura: item.alturaCm ? formatarMedidaAvaliacao(item.alturaCm, 'cm') : null,
    ativa: avaliacaoEditandoId.value === item.id,
    origem: item,
  })),
);

const totalEventosAtendimento = computed(() => atendimento.value?.timeline?.length ?? 0);

function rotuloObjetivoBolso(objetivo: string): string {
  return OPCOES_OBJETIVO_BOLSO.find((opcao) => opcao.value === objetivo)?.label ?? objetivo;
}

function formatarKcal(valor: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(valor)} kcal`;
}

function percentualMacro(gramas: number, kcalPorGrama: number, totalKcal: number): string {
  if (!totalKcal) {
    return '—';
  }

  const percentual = (gramas * kcalPorGrama * 100) / totalKcal;
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(percentual)}%`;
}

const historicoMacros = computed(() =>
  regras.value.map((item) => ({
    id: item.id,
    objetivo: rotuloObjetivoBolso(item.objetivo),
    calorias: formatarKcal(item.calorias),
    proteinas: formatarMedidaAvaliacao(item.proteinasG, 'g'),
    carboidratos: formatarMedidaAvaliacao(item.carboidratosG, 'g'),
    gorduras: formatarMedidaAvaliacao(item.gordurasG, 'g'),
    proteinasPct: percentualMacro(item.proteinasG, 4, item.calorias),
    carboidratosPct: percentualMacro(item.carboidratosG, 4, item.calorias),
    gordurasPct: percentualMacro(item.gordurasG, 9, item.calorias),
    peso: formatarMedidaAvaliacao(item.pesoKg, 'kg'),
    gasto: formatarKcal(item.gastoEnergeticoTotal),
    data: formatarDataBrasil(item.criadoEm),
    hora: formatarHoraBrasil(item.criadoEm),
  })),
);

async function enviarArquivo(tipo: 'Exame' | 'Documento'): Promise<void> {
  const arquivo = arquivoUnico(tipo === 'Exame' ? arquivoExame.value : arquivoDocumento.value);
  const meta = tipo === 'Exame' ? anexo : documento;
  if (!arquivo) {
    notificacao.erro('Selecione um arquivo.');
    return;
  }
  salvando.value = true;
  try {
    const form = new FormData();
    form.append('file', arquivo);
    form.append('tipo', tipo);
    form.append('nome', meta.nome || arquivo.name);
    form.append(tipo === 'Exame' ? 'categoriaExame' : 'categoriaDocumento', meta.categoria);
    if (meta.observacao) {
      form.append('observacao', meta.observacao);
    }
    await prontuarioService.enviarAnexo(atendimentoId.value, form);
    notificacao.sucesso('Arquivo enviado.');
    if (tipo === 'Exame') {
      exames.value = await prontuarioService.listarAnexos(atendimentoId.value, 'Exame');
      arquivoExame.value = null;
    } else {
      documentos.value = await prontuarioService.listarAnexos(atendimentoId.value, 'Documento');
      arquivoDocumento.value = null;
    }
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

async function enviarFoto(): Promise<void> {
  const arquivo = arquivoUnico(arquivoFoto.value);
  if (!arquivo) {
    notificacao.erro('Selecione uma foto.');
    return;
  }
  salvando.value = true;
  try {
    const form = new FormData();
    form.append('file', arquivo);
    form.append('categoria', foto.categoria);
    if (foto.observacao) {
      form.append('observacao', foto.observacao);
    }
    await prontuarioService.enviarFoto(atendimentoId.value, form);
    notificacao.sucesso('Foto adicionada.');
    fotos.value = await prontuarioService.listarFotos(atendimentoId.value);
    fotosPaciente.value = await prontuarioService.listarFotosPaciente(pacienteId.value);
    arquivoFoto.value = null;
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

async function comparar(): Promise<void> {
  if (!comparativo.esquerdaId || !comparativo.direitaId) {
    notificacao.erro('Selecione duas fotos.');
    return;
  }
  try {
    comparacao.value = await prontuarioService.compararFotos(comparativo.esquerdaId, comparativo.direitaId);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  }
}

function preencherVentaDaAvaliacao(item: BodyAssessment | null): void {
  if (!item) {
    return;
  }

  if (venta.pesoKg == null && item.pesoKg != null) {
    venta.pesoKg = item.pesoKg;
  }

  if (venta.alturaCm == null && item.alturaCm != null) {
    venta.alturaCm = item.alturaCm;
  }
}

async function calcularVenta(): Promise<void> {
  if (venta.pesoKg == null || venta.alturaCm == null) {
    notificacao.erro('Informe peso e altura na VENTA ou registre na aba Avaliação.');
    return;
  }

  if (!venta.pesoDesejadoKg) {
    notificacao.erro('Informe o peso desejado.');
    return;
  }

  salvando.value = true;
  try {
    await prontuarioService.criarVenta(atendimentoId.value, {
      perfil: venta.perfil,
      protocolo: venta.protocolo,
      nivelAtividade: venta.nivelAtividade,
      pesoKg: venta.pesoKg,
      alturaCm: venta.alturaCm,
      massaMagraKg: ultimaAvaliacao.value?.massaMagraKg ?? null,
      pesoDesejadoKg: venta.pesoDesejadoKg,
      tempoDias: venta.tempoDias,
      fatorInjuria: venta.fatorInjuria,
    });
    notificacao.sucesso('VENTA calculada.');
    ventas.value = await prontuarioService.listarVenta(atendimentoId.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

async function calcularRegra(): Promise<void> {
  if (!resumoNutricao.value.podeCalcularMacros) {
    notificacao.erro('Informe o peso e calcule a VENTA acima antes dos macros.');
    return;
  }

  salvando.value = true;
  try {
    await prontuarioService.criarRegraBolso(atendimentoId.value, {
      objetivo: regra.objetivo,
      pesoKg: resumoNutricao.value.peso,
      gastoEnergeticoTotal: resumoNutricao.value.gasto,
    });
    notificacao.sucesso('Regra de bolso calculada.');
    regras.value = await prontuarioService.listarRegraBolso(atendimentoId.value);
  } catch (error) {
    notificacao.erro(obterMensagem(error));
  } finally {
    salvando.value = false;
  }
}

onMounted(() => {
  void carregar();
});

watch(modeloId, (id) => {
  const existente = anamneses.value.find((item) => item.modeloAnamneseId === id);
  if (!existente) {
    respostas.value = {};
    return;
  }

  try {
    respostas.value = JSON.parse(existente.respostasJson) as Record<
      string,
      string | number | boolean | string[] | null
    >;
  } catch {
    respostas.value = {};
  }
});
</script>

<template>
  <q-page class="page-content page-content--fluid q-pa-md">
    <app-page-header
      titulo="Atendimento"
      :subtitulo="
        atendimento
          ? `${atendimento.pacienteNome} · ${rotuloStatusAtendimento(atendimento.status)} · ${atendimento.funcionarioNome}`
          : 'Sessão clínica do paciente.'
      "
    >
      <q-btn
        flat
        color="primary"
        icon="arrow_back"
        label="Prontuário"
        no-caps
        @click="router.push({ name: 'pacientes-prontuario', params: { id: pacienteId } })"
      />
      <q-btn
        v-if="podeEditar && atendimento?.status === 'EmAndamento'"
        outline
        color="primary"
        label="Finalizar"
        no-caps
        :disable="salvando"
        @click="finalizar"
      />
    </app-page-header>

    <q-tabs v-model="aba" dense no-caps active-color="primary" indicator-color="primary" class="q-mb-md">
      <q-tab name="resumo" label="Resumo" />
      <q-tab name="anamnese" label="Anamnese" />
      <q-tab name="avaliacao" label="Avaliação" />
      <q-tab name="exames" label="Exames" />
      <q-tab name="fotos" label="Fotos" />
      <q-tab name="anotacoes" label="Anotações" />
      <q-tab name="documentos" label="Documentos" />
      <q-tab name="nutricao" label="VENTA" />
    </q-tabs>

    <q-card v-if="carregando" flat bordered class="q-mb-md">
      <q-card-section>
        <app-table-skeleton :columns="4" />
      </q-card-section>
    </q-card>

    <q-tab-panels v-else v-model="aba" :animated="false" class="atendimento-paineis">
      <q-tab-panel name="resumo">
        <template v-if="atendimento">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="secao-titulo">Sessão</div>
              <div class="campo"><span>Unidade</span><strong>{{ atendimento.unidadeNome }}</strong></div>
              <div class="campo"><span>Profissional</span><strong>{{ atendimento.funcionarioNome }}</strong></div>
              <div class="campo"><span>Início</span><strong>{{ formatarDataHoraBrasil(atendimento.dataInicio) }}</strong></div>
              <div class="campo"><span>Observação</span><strong>{{ atendimento.observacao || '—' }}</strong></div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="secao-titulo">
                Histórico deste atendimento
                <span v-if="totalEventosAtendimento" class="secao-titulo__contagem">
                  {{ totalEventosAtendimento }}
                </span>
              </div>
              <app-historico-clinico
                :eventos="atendimento.timeline ?? []"
                vazio-titulo="Nenhuma alteração"
                vazio-texto="As anotações, avaliações e arquivos deste atendimento aparecem aqui."
              />
            </q-card-section>
          </q-card>

          <q-card flat bordered>
            <q-card-section>
              <app-entity-audit-section
                :ativo="true"
                :registro-id="atendimento.id"
                entidade-auditoria="AtendimentoClinico"
                :criado-em="atendimento.criadoEm"
                :atualizado-em="atendimento.atualizadoEm"
                mostrar-titulo-secao
              />
            </q-card-section>
          </q-card>
        </template>
      </q-tab-panel>

      <q-tab-panel name="anamnese">
        <q-card flat bordered>
          <q-card-section class="form-stack">
            <q-select
              v-model="modeloId"
              class="form-field--required"
              :options="modelos"
              option-label="nome"
              option-value="id"
              emit-value
              map-options
              label="Modelo de anamnese"
              outlined
            />
            <div v-for="campo in camposAnamnese" :key="campo.id">
              <app-anamnese-campo v-model="respostas[campo.id]" :campo="campo" />
            </div>
            <app-empty-state
              v-if="!modeloId && camposAnamnese.length === 0"
              icon="assignment"
              titulo="Nenhum modelo selecionado"
              texto="Escolha um modelo de anamnese da clínica para preencher."
            />
            <q-btn
              v-if="podeAnamnese"
              unelevated
              color="primary"
              label="Salvar anamnese"
              no-caps
              :disable="salvando || !modeloId"
              @click="salvarAnamnese"
            />
            <div v-if="anamneseAtual?.versoes?.length" class="q-mt-md">
              <div class="secao-titulo">Versões</div>
              <div v-for="versao in anamneseAtual.versoes" :key="versao.id" class="timeline-item">
                <strong>Versão {{ versao.versao }}</strong>
                <span>{{ formatarDataHoraBrasil(versao.criadoEm) }} · {{ versao.funcionarioNome }}</span>
                <small v-if="versao.resumoAlteracao">{{ versao.resumoAlteracao }}</small>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="avaliacao">
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="form-stack">
            <div class="secao-titulo">{{ avaliacaoEditandoId ? 'Corrigir avaliação' : 'Nova avaliação' }}</div>

            <div class="secao-titulo">Dados básicos</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6 col-md-3">
                <q-input v-model.number="avaliacao.alturaCm" type="number" outlined label="Altura (cm)" />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-input v-model.number="avaliacao.pesoKg" type="number" outlined label="Peso (kg)" />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-input v-model.number="avaliacao.cinturaCm" type="number" outlined label="Cintura (cm)" />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-input v-model.number="avaliacao.quadrilCm" type="number" outlined label="Quadril (cm)" />
              </div>
              <div class="col-12">
                <q-input v-model="avaliacao.observacao" type="textarea" outlined label="Observação" autogrow />
              </div>
            </div>

            <q-list class="avaliacao-grupos" bordered separator>
              <q-expansion-item
                label="Bioimpedância"
                caption="Massa gorda, magra, água e demais medidas"
                switch-toggle-side
                expand-separator
                :duration="0"
                header-class="avaliacao-grupo__header"
              >
                <div class="row q-col-gutter-md q-pa-md">
                  <div class="col-12 col-sm-6 col-md-4">
                    <q-input v-model.number="bioimpedancia.percentualMassaGorda" type="number" outlined label="% massa gorda" />
                  </div>
                  <div class="col-12 col-sm-6 col-md-4">
                    <q-input v-model.number="bioimpedancia.percentualMassaMagra" type="number" outlined label="% massa magra" />
                  </div>
                  <div class="col-12 col-sm-6 col-md-4">
                    <q-input v-model.number="bioimpedancia.percentualAgua" type="number" outlined label="% água" />
                  </div>
                  <div class="col-12 col-sm-6 col-md-4">
                    <q-input v-model.number="bioimpedancia.gorduraVisceral" type="number" outlined label="Gordura visceral" />
                  </div>
                  <div class="col-12 col-sm-6 col-md-4">
                    <q-input v-model.number="bioimpedancia.idadeMetabolica" type="number" outlined label="Idade metabólica" />
                  </div>
                  <div class="col-12 col-sm-6 col-md-4">
                    <q-input v-model.number="bioimpedancia.pesoMuscularKg" type="number" outlined label="Peso muscular (kg)" />
                  </div>
                </div>
              </q-expansion-item>

              <q-expansion-item
                label="Circunferências"
                caption="Medidas em centímetros"
                switch-toggle-side
                expand-separator
                :duration="0"
                header-class="avaliacao-grupo__header"
              >
                <div class="row q-col-gutter-md q-pa-md">
                  <div v-for="campo in camposCircunferencia" :key="campo.chave" class="col-12 col-sm-6 col-md-3">
                    <q-input v-model.number="circunferencias[campo.chave]" type="number" outlined :label="campo.label" />
                  </div>
                </div>
              </q-expansion-item>

              <q-expansion-item
                label="Pregas cutâneas"
                caption="Jackson & Pollock · medidas em milímetros"
                switch-toggle-side
                expand-separator
                :duration="0"
                header-class="avaliacao-grupo__header"
              >
                <div class="q-pa-md form-stack">
                  <q-select
                    v-model="avaliacao.protocoloPrega"
                    :options="protocolosPrega"
                    emit-value
                    map-options
                    outlined
                    label="Protocolo"
                    clearable
                  />
                  <div class="row q-col-gutter-md">
                    <div v-for="campo in camposPrega" :key="campo.chave" class="col-12 col-sm-6 col-md-3">
                      <q-input v-model.number="pregas[campo.chave]" type="number" outlined :label="campo.label" />
                    </div>
                  </div>
                </div>
              </q-expansion-item>
            </q-list>

            <div class="row q-gutter-sm">
              <q-btn
                v-if="podeAvaliacao"
                unelevated
                color="primary"
                :label="avaliacaoEditandoId ? 'Salvar correção' : 'Registrar avaliação'"
                no-caps
                :disable="salvando"
                @click="salvarAvaliacao"
              />
              <q-btn
                v-if="avaliacaoEditandoId"
                flat
                color="primary"
                label="Nova medição"
                no-caps
                @click="novaAvaliacao"
              />
            </div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <div class="secao-titulo">
              Histórico de avaliações
              <span v-if="historicoAvaliacoes.length" class="secao-titulo__contagem">
                {{ historicoAvaliacoes.length }}
              </span>
            </div>
            <app-empty-state
              v-if="historicoAvaliacoes.length === 0"
              icon="monitor_weight"
              titulo="Nenhuma avaliação"
              texto="Registre a primeira medição. Cada nova avaliação entra no histórico, sem substituir as anteriores."
            />
            <div v-else class="avaliacao-historico">
              <article
                v-for="item in historicoAvaliacoes"
                :key="item.id"
                class="avaliacao-historico__item"
                :class="{ 'avaliacao-historico__item--ativa': item.ativa }"
              >
                <div class="avaliacao-historico__topo">
                  <div>
                    <div class="avaliacao-historico__data">{{ item.data }}</div>
                    <div class="avaliacao-historico__meta">
                      {{ item.hora }} · {{ item.profissional }}
                    </div>
                  </div>
                  <q-btn
                    v-if="podeAvaliacao"
                    flat
                    dense
                    color="primary"
                    no-caps
                    :label="item.ativa ? 'Corrigindo' : 'Corrigir'"
                    :disable="item.ativa"
                    @click="preencherAvaliacao(item.origem)"
                  />
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm-4">
                    <div class="avaliacao-historico__metrica">
                      <span>Peso</span>
                      <strong>{{ item.peso }}</strong>
                    </div>
                  </div>
                  <div class="col-12 col-sm-4">
                    <div class="avaliacao-historico__metrica">
                      <span>IMC</span>
                      <strong>{{ item.imc }}</strong>
                    </div>
                  </div>
                  <div class="col-12 col-sm-4">
                    <div
                      class="avaliacao-historico__metrica"
                      :class="`avaliacao-historico__metrica--${item.tom}`"
                    >
                      <span>Classificação</span>
                      <strong>{{ item.classificacao }}</strong>
                    </div>
                  </div>
                </div>

                <div v-if="item.altura || item.pesoIdeal" class="avaliacao-historico__extras">
                  <span v-if="item.altura">Altura {{ item.altura }}</span>
                  <span v-if="item.pesoIdeal">Peso ideal {{ item.pesoIdeal }}</span>
                </div>
              </article>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="exames">
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="form-stack">
            <q-input v-model="anexo.nome" outlined label="Nome do exame" />
            <q-select v-model="anexo.categoria" :options="CATEGORIAS_EXAME" outlined label="Categoria" />
            <q-file v-model="arquivoExame" outlined label="Arquivo PDF/JPG/PNG" accept=".pdf,image/jpeg,image/png" />
            <q-btn v-if="podeExame" unelevated color="primary" label="Enviar exame" no-caps :disable="salvando" @click="enviarArquivo('Exame')" />
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <app-empty-state
              v-if="exames.length === 0"
              icon="lab_profile"
              titulo="Nenhum exame"
              texto="Envie o primeiro exame deste atendimento."
            />
            <div v-for="item in exames" :key="item.id" class="timeline-item">
              <a :href="item.url" target="_blank" rel="noopener">{{ item.nome }}</a>
              <span>{{ formatarDataHoraBrasil(item.dataDocumento) }} · {{ item.funcionarioNome }}</span>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="fotos">
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="form-stack">
            <q-select
              v-model="foto.categoria"
              :options="CATEGORIAS_FOTO"
              emit-value
              map-options
              outlined
              label="Categoria"
            />
            <q-file v-model="arquivoFoto" outlined label="Foto" accept="image/*" />
            <q-btn v-if="podeFoto" unelevated color="primary" label="Enviar foto" no-caps :disable="salvando" @click="enviarFoto" />
          </q-card-section>
        </q-card>
        <q-card v-if="fotos.length === 0" flat bordered class="q-mb-md">
          <q-card-section>
            <app-empty-state
              icon="photo_camera"
              titulo="Nenhuma foto"
              texto="Envie fotos para o comparativo de evolução."
            />
          </q-card-section>
        </q-card>
        <div v-else class="row q-col-gutter-md q-mb-md">
          <div v-for="item in fotos" :key="item.id" class="col-12 col-sm-6">
            <div class="foto-card">
              <img :src="item.url" :alt="item.categoria" />
              <span>{{ item.categoria }} · {{ formatarDataHoraBrasil(item.dataCaptura) }}</span>
            </div>
          </div>
        </div>
        <q-card flat bordered>
          <q-card-section class="form-stack">
            <div class="secao-titulo">Comparativo</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-select
                  v-model="comparativo.esquerdaId"
                  :options="fotosComparacao"
                  option-label="rotulo"
                  option-value="id"
                  emit-value
                  map-options
                  outlined
                  label="Foto 1"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-select
                  v-model="comparativo.direitaId"
                  :options="fotosComparacao"
                  option-label="rotulo"
                  option-value="id"
                  emit-value
                  map-options
                  outlined
                  label="Foto 2"
                />
              </div>
            </div>
            <q-btn outline color="primary" label="Comparar" no-caps @click="comparar" />
            <div v-if="comparacao" class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <img class="foto-card__img" :src="comparacao.esquerda.url" alt="Antes" />
              </div>
              <div class="col-12 col-md-6">
                <img class="foto-card__img" :src="comparacao.direita.url" alt="Depois" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="anotacoes">
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="form-stack">
            <q-select v-model="nota.tipo" :options="TIPOS_ANOTACAO" emit-value map-options outlined label="Tipo" />
            <q-editor v-model="nota.texto" min-height="140px" />
            <q-btn v-if="podeAnotacao" unelevated color="primary" label="Registrar anotação" no-caps :disable="salvando || !nota.texto" @click="salvarNota" />
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <app-empty-state
              v-if="anotacoes.length === 0"
              icon="notes"
              titulo="Nenhuma anotação"
              texto="Registre evolução, intercorrência ou observação deste atendimento."
            />
            <div v-for="item in anotacoes" :key="item.id" class="timeline-item">
              <strong>{{ item.tipo }} · {{ item.funcionarioNome }}</strong>
              <span>{{ formatarDataHoraBrasil(item.data) }}</span>
              <div v-html="item.texto" />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="documentos">
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="form-stack">
            <q-input v-model="documento.nome" outlined label="Nome do documento" />
            <q-select
              v-model="documento.categoria"
              :options="CATEGORIAS_DOCUMENTO"
              emit-value
              map-options
              outlined
              label="Categoria"
            />
            <q-file v-model="arquivoDocumento" outlined label="Arquivo" accept=".pdf,image/jpeg,image/png" />
            <q-btn v-if="podeDocumento" unelevated color="primary" label="Enviar documento" no-caps :disable="salvando" @click="enviarArquivo('Documento')" />
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <app-empty-state
              v-if="documentos.length === 0"
              icon="description"
              titulo="Nenhum documento"
              texto="Anexe consentimentos, receitas ou outros arquivos deste atendimento."
            />
            <div v-for="item in documentos" :key="item.id" class="timeline-item">
              <a :href="item.url" target="_blank" rel="noopener">{{ item.nome }}</a>
              <span>{{ formatarDataHoraBrasil(item.dataDocumento) }} · {{ item.funcionarioNome }}</span>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="nutricao">
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="form-stack">
            <div class="secao-titulo">VENTA</div>
            <p class="text-secondary">
              Peso e altura entram no cálculo. Se já registrou na aba Avaliação, eles vêm preenchidos.
              Sexo e data de nascimento vêm do cadastro do paciente.
            </p>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-select v-model="venta.perfil" :options="OPCOES_PERFIL_VENTA" emit-value map-options outlined label="Perfil" />
              </div>
              <div class="col-12 col-md-6">
                <q-select v-model="venta.protocolo" :options="OPCOES_PROTOCOLO_VENTA" emit-value map-options outlined label="Protocolo" />
              </div>
              <div class="col-12 col-md-6">
                <q-select v-model="venta.nivelAtividade" :options="OPCOES_NIVEL_ATIVIDADE" emit-value map-options outlined label="Atividade" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model.number="venta.pesoKg" class="form-field--required" type="number" outlined label="Peso atual (kg)" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model.number="venta.alturaCm" class="form-field--required" type="number" outlined label="Altura (cm)" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model.number="venta.pesoDesejadoKg" class="form-field--required" type="number" outlined label="Peso desejado (kg)" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model.number="venta.tempoDias" type="number" outlined label="Tempo (dias)" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model.number="venta.fatorInjuria" type="number" outlined label="Fator de injúria" />
              </div>
            </div>
            <div class="row q-gutter-sm q-mt-md">
              <q-btn v-if="podeEditar" unelevated color="primary" label="Calcular VENTA" no-caps :disable="salvando" @click="calcularVenta" />
            </div>
            <div v-for="item in ventas" :key="item.id" class="timeline-item">
              <strong>Meta {{ item.metaCaloricaDiaria }} kcal</strong>
              <span>TMB {{ item.gastoEnergeticoBasal }} · GET {{ item.gastoEnergeticoTotal }} · ajuste {{ item.ajusteCaloricoDiario }}</span>
            </div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section class="form-stack">
            <div class="secao-titulo">Regra de bolso</div>
            <p class="text-secondary">
              Os macros usam o peso informado na VENTA/avaliação e o GET da última VENTA deste atendimento.
              Não há campo de gasto energético aqui — ele sai do cálculo acima.
            </p>
            <p v-if="resumoNutricao.podeCalcularMacros" class="text-secondary">
              Usando peso {{ resumoNutricao.peso }} kg · GET {{ resumoNutricao.gasto }} kcal
            </p>
            <p v-else class="text-secondary">
              Calcule a VENTA acima antes de gerar os macros.
            </p>
            <q-select v-model="regra.objetivo" :options="OPCOES_OBJETIVO_BOLSO" emit-value map-options outlined label="Objetivo" />
            <q-btn
              v-if="podeEditar"
              unelevated
              color="primary"
              label="Calcular macros"
              no-caps
              :disable="salvando || !resumoNutricao.podeCalcularMacros"
              @click="calcularRegra"
            />
            <div v-if="historicoMacros.length" class="macros-historico">
              <article
                v-for="item in historicoMacros"
                :key="item.id"
                class="avaliacao-historico__item"
              >
                <div class="avaliacao-historico__topo">
                  <div>
                    <div class="avaliacao-historico__data">{{ item.objetivo }}</div>
                    <div class="avaliacao-historico__meta">
                      {{ item.data }} · {{ item.hora }}
                    </div>
                  </div>
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-6 col-sm-3">
                    <div class="avaliacao-historico__metrica">
                      <span>Energia</span>
                      <strong>{{ item.calorias }}</strong>
                    </div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="avaliacao-historico__metrica">
                      <span>Proteínas</span>
                      <strong>{{ item.proteinas }}</strong>
                      <em>{{ item.proteinasPct }} das kcal</em>
                    </div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="avaliacao-historico__metrica">
                      <span>Carboidratos</span>
                      <strong>{{ item.carboidratos }}</strong>
                      <em>{{ item.carboidratosPct }} das kcal</em>
                    </div>
                  </div>
                  <div class="col-6 col-sm-3">
                    <div class="avaliacao-historico__metrica">
                      <span>Gorduras</span>
                      <strong>{{ item.gorduras }}</strong>
                      <em>{{ item.gordurasPct }} das kcal</em>
                    </div>
                  </div>
                </div>

                <div class="avaliacao-historico__extras">
                  <span>Peso {{ item.peso }}</span>
                  <span>GET {{ item.gasto }}</span>
                </div>
              </article>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<style scoped lang="scss">
.atendimento-paineis {
  background: transparent;
}

.atendimento-paineis :deep(.q-tab-panel) {
  padding: 0;
}

.secao-titulo {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  font-weight: var(--ds-font-weight-medium);
  margin-bottom: var(--ds-space-3);
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

.avaliacao-grupos {
  border-radius: var(--ds-radius-md);
  border-color: var(--ds-border-default);
}

.avaliacao-grupo__header {
  color: var(--ds-text-primary);
  font-weight: var(--ds-font-weight-medium);
}

.campo {
  display: flex;
  justify-content: space-between;
  gap: var(--ds-space-3);
  margin-bottom: var(--ds-space-2);
  color: var(--ds-text-secondary);

  strong {
    color: var(--ds-text-primary);
  }
}

.timeline-item {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--ds-space-3);
  color: var(--ds-text-secondary);

  strong {
    color: var(--ds-text-primary);
  }
}

.avaliacao-historico {
  display: grid;
  gap: var(--ds-space-3);
}

.avaliacao-historico__item {
  padding: var(--ds-space-4);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-page);
}

.avaliacao-historico__item--ativa {
  border-color: var(--ds-border-focus);
  background: var(--ds-bg-subtle);
}

.avaliacao-historico__topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ds-space-3);
  margin-bottom: var(--ds-space-3);
}

.avaliacao-historico__data {
  color: var(--ds-text-primary);
  font-size: var(--ds-font-size-base);
  font-weight: var(--ds-font-weight-semibold);
  line-height: var(--ds-line-height-tight);
}

.avaliacao-historico__meta {
  margin-top: var(--ds-space-1);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
}

.avaliacao-historico__metrica {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-height: 64px;
  padding: var(--ds-space-3);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-surface);

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

.macros-historico {
  display: grid;
  gap: var(--ds-space-3);
  margin-top: var(--ds-space-3);
}

.avaliacao-historico__metrica--ok strong {
  color: var(--ds-color-success-600);
}

.avaliacao-historico__metrica--alerta strong {
  color: var(--ds-color-warning-600);
}

.avaliacao-historico__metrica--risco strong {
  color: var(--ds-color-error-600);
}

.avaliacao-historico__extras {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-3);
  margin-top: var(--ds-space-3);
  color: var(--ds-text-secondary);
  font-size: var(--ds-font-size-sm);
}

.foto-card {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  color: var(--ds-text-secondary);
}

.foto-card img,
.foto-card__img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: var(--ds-radius-md);
  border: 1px solid var(--ds-border-default);
}

.text-secondary {
  color: var(--ds-text-secondary);
}
</style>
