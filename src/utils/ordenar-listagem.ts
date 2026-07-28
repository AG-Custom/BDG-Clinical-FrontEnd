export function compararTextoPt(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

export function ordenarPorUnidadeNome<T extends { unidadeNome?: string | null }>(
  itens: T[],
  compararSecundario?: (a: T, b: T) => number,
): T[] {
  return [...itens].sort((a, b) => {
    const porUnidade = compararTextoPt(a.unidadeNome ?? '', b.unidadeNome ?? '');
    if (porUnidade !== 0) {
      return porUnidade;
    }

    return compararSecundario?.(a, b) ?? 0;
  });
}
