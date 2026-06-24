const PROPRIEDADES_COR = [
  '--ds-brand-primary',
  '--ds-color-primary-500',
  '--ds-color-primary-600',
  '--ds-color-primary-700',
  '--q-primary',
] as const;

export function aplicarCorPrincipal(corPrincipal: string | null | undefined): void {
  const root = document.documentElement;

  if (!corPrincipal) {
    for (const propriedade of PROPRIEDADES_COR) {
      root.style.removeProperty(propriedade);
    }

    return;
  }

  for (const propriedade of PROPRIEDADES_COR) {
    root.style.setProperty(propriedade, corPrincipal);
  }
}

export function validarCorHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}
