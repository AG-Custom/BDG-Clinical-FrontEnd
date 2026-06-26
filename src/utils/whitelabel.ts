import { DesignSystemBrand } from '@/constants/design-system';

const PROPRIEDADES_COR = [
  '--ds-brand-primary',
  '--ds-color-primary-500',
  '--ds-color-primary-600',
  '--ds-color-primary-700',
  '--q-primary',
] as const;

const FAVICON_PADRAO = '/favicon.svg';
const FAVICON_SELECTOR = 'link[data-app-favicon]';

function inferirTipoImagem(url: string): string {
  const path = url.split('?')[0]?.toLowerCase() ?? '';

  if (path.endsWith('.png')) {
    return 'image/png';
  }

  if (path.endsWith('.webp')) {
    return 'image/webp';
  }

  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  return 'image/svg+xml';
}

function obterLinkFavicon(): HTMLLinkElement {
  const existente = document.head.querySelector<HTMLLinkElement>(FAVICON_SELECTOR);

  if (existente) {
    return existente;
  }

  const link = document.createElement('link');
  link.rel = 'icon';
  link.setAttribute('data-app-favicon', '');
  document.head.appendChild(link);

  return link;
}

export function aplicarFavicon(logoUrl: string | null | undefined): void {
  const href = logoUrl?.trim() || FAVICON_PADRAO;
  const link = obterLinkFavicon();

  link.href = href;
  link.type = inferirTipoImagem(href);
}

export function aplicarTituloDocumento(nomeClinica: string | null | undefined): void {
  const nome = nomeClinica?.trim();
  document.title = nome || DesignSystemBrand.nome;
}

export interface MarcaDocumento {
  nome?: string | null | undefined;
  logo?: string | null | undefined;
}

export function aplicarMarcaDocumento(marca: MarcaDocumento): void {
  if (marca.logo !== undefined) {
    aplicarFavicon(marca.logo);
  }

  if (marca.nome !== undefined) {
    aplicarTituloDocumento(marca.nome);
  }
}

export function restaurarMarcaDocumentoPadrao(): void {
  aplicarMarcaDocumento({ nome: null, logo: null });
}

export function restaurarFaviconPadrao(): void {
  aplicarFavicon(null);
}

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
