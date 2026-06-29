export function usuarioPossuiPermissao(permissoes: string[], permissao: string): boolean {
  if (permissoes.includes(permissao)) {
    return true;
  }

  const prefixo = `${permissao}.`;

  return permissoes.some((chave) => chave.startsWith(prefixo));
}

export function usuarioPossuiAlgumaPermissao(
  permissoes: string[],
  chaves: string[],
): boolean {
  return chaves.some((chave) => usuarioPossuiPermissao(permissoes, chave));
}

export function usuarioPossuiTodasPermissoes(
  permissoes: string[],
  chaves: string[],
): boolean {
  return chaves.every((chave) => usuarioPossuiPermissao(permissoes, chave));
}
