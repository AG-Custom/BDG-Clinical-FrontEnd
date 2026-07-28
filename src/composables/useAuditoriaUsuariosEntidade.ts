import { isAxiosError } from 'axios';
import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

import { auditoriaService } from '@/services/auditoria.service';
import { usuarioDisplayService } from '@/services/usuario-display.service';

function pareceGuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

function normalizarGuid(valor: string | null | undefined): string | null {
  if (!valor) {
    return null;
  }

  return String(valor).toLowerCase();
}

function ehCancelamento(erro: unknown): boolean {
  return isAxiosError(erro) && erro.code === 'ERR_CANCELED';
}

function normalizarMapaNomes(nomes: Map<string, string>): Map<string, string> {
  const normalizado = new Map<string, string>();

  for (const [id, nome] of nomes) {
    normalizado.set(id.toLowerCase(), nome);
  }

  return normalizado;
}

export function useAuditoriaUsuariosEntidade(
  aberto: Ref<boolean>,
  registroId: Ref<string | null | undefined>,
  entidadeAuditoria: Ref<string | undefined>,
  idUsuarioCriacaoFallback?: Ref<string | null | undefined>,
  chaveConteudo?: Ref<string | undefined>,
) {
  const idUsuarioCriacao = ref<string | null>(null);
  const idUsuarioAtualizacao = ref<string | null>(null);
  const nomesUsuario = ref<Map<string, string>>(new Map());
  const carregandoUsuarios = ref(false);
  const falhaCarregamento = ref(false);

  let abortController: AbortController | null = null;

  watch(
    () =>
      [
        aberto.value,
        registroId.value,
        entidadeAuditoria.value,
        chaveConteudo?.value,
      ] as const,
    ([isAberto, id, entidade]) => {
      abortController?.abort();
      abortController = null;

      if (!isAberto) {
        idUsuarioCriacao.value = null;
        idUsuarioAtualizacao.value = null;
        nomesUsuario.value = new Map();
        carregandoUsuarios.value = false;
        falhaCarregamento.value = false;
        return;
      }

      void carregarUsuarios(id, entidade);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    abortController?.abort();
    abortController = null;
  });

  async function carregarUsuarios(
    idRegistro: string | null | undefined,
    entidade: string | undefined,
  ): Promise<void> {
    idUsuarioCriacao.value = null;
    idUsuarioAtualizacao.value = null;
    nomesUsuario.value = new Map();
    falhaCarregamento.value = false;

    if (!idRegistro || !pareceGuid(idRegistro) || !entidade) {
      return;
    }

    const controller = new AbortController();
    abortController = controller;
    carregandoUsuarios.value = true;

    try {
      const resumo = await auditoriaService.obterResumo(entidade, idRegistro, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      idUsuarioCriacao.value = normalizarGuid(
        resumo.idUsuarioCriacao ?? idUsuarioCriacaoFallback?.value ?? null,
      );
      idUsuarioAtualizacao.value = normalizarGuid(resumo.idUsuarioAtualizacao);

      const ids = [idUsuarioCriacao.value, idUsuarioAtualizacao.value].filter(
        (id): id is string => Boolean(id),
      );
      const idsUnicos = [...new Set(ids)];

      if (idsUnicos.length > 0) {
        const nomes = await usuarioDisplayService.resolverNomes(idsUnicos, controller.signal);

        if (!controller.signal.aborted) {
          nomesUsuario.value = normalizarMapaNomes(nomes);
        }
      }
    } catch (erro) {
      if (!controller.signal.aborted && !ehCancelamento(erro)) {
        falhaCarregamento.value = true;
        idUsuarioCriacao.value = normalizarGuid(idUsuarioCriacaoFallback?.value ?? null);
        idUsuarioAtualizacao.value = null;

        if (idUsuarioCriacao.value) {
          const nomes = await usuarioDisplayService.resolverNomes(
            [idUsuarioCriacao.value],
            controller.signal,
          );

          if (!controller.signal.aborted) {
            nomesUsuario.value = normalizarMapaNomes(nomes);
          }
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        carregandoUsuarios.value = false;
      }
    }
  }

  function textoUsuario(usuarioId: string | null): string {
    if (!usuarioId) {
      return '';
    }

    const idNormalizado = usuarioId.toLowerCase();

    if (carregandoUsuarios.value && !nomesUsuario.value.has(idNormalizado)) {
      return '· carregando…';
    }

    const nome = nomesUsuario.value.get(idNormalizado);

    if (!nome) {
      return '· —';
    }

    return `· por ${nome}`;
  }

  function rotuloUsuarioLinha(usuarioId: string | null, entidade?: string): string {
    if (!entidade) {
      return '';
    }

    if (carregandoUsuarios.value) {
      return '· carregando…';
    }

    if (usuarioId) {
      return textoUsuario(usuarioId);
    }

    if (falhaCarregamento.value) {
      return '· indisponível';
    }

    return '· —';
  }

  return {
    idUsuarioCriacao,
    idUsuarioAtualizacao,
    carregandoUsuarios,
    falhaCarregamento,
    textoUsuario,
    rotuloUsuarioLinha,
  };
}
