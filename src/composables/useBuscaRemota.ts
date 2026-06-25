import axios from 'axios';
import { onUnmounted, ref, watch, type Ref } from 'vue';

export interface UseBuscaRemotaOptions {
  debounceMs?: number;
  minCaracteres?: number;
}

export function isRequisicaoCancelada(error: unknown): boolean {
  if (axios.isCancel(error)) {
    return true;
  }

  return error instanceof DOMException && error.name === 'AbortError';
}

export function useBuscaRemota(
  termo: Ref<string>,
  buscar: (termo: string, signal: AbortSignal) => Promise<void>,
  options: UseBuscaRemotaOptions = {},
) {
  const carregando = ref(false);
  const debounceMs = options.debounceMs ?? 300;
  const minCaracteres = options.minCaracteres ?? 2;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  async function executarBusca(termoBusca: string): Promise<void> {
    controller?.abort();
    controller = new AbortController();
    carregando.value = true;

    try {
      await buscar(termoBusca, controller.signal);
    } catch (error) {
      if (!isRequisicaoCancelada(error)) {
        throw error;
      }
    } finally {
      carregando.value = false;
    }
  }

  function agendarBusca(): void {
    clearTimeout(timeoutId);
    controller?.abort();
    carregando.value = false;

    const termoBusca = termo.value.trim();

    if (termoBusca.length === 0) {
      void executarBusca('');
      return;
    }

    if (termoBusca.length < minCaracteres) {
      return;
    }

    timeoutId = setTimeout(() => {
      void executarBusca(termoBusca);
    }, debounceMs);
  }

  watch(termo, agendarBusca);

  onUnmounted(() => {
    clearTimeout(timeoutId);
    controller?.abort();
  });

  return { carregando };
}
