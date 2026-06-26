export function normalizarLista<T>(valor: T[] | null | undefined): T[] {
  return Array.isArray(valor) ? valor : [];
}
