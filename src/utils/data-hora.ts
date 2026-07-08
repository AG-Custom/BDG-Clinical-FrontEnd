export const FUSO_HORARIO_BRASIL = 'America/Sao_Paulo';

const TEM_FUSO_EXPLICITO = /(?:z|[+-]\d{2}:?\d{2})$/i;
const TEM_HORARIO = /t\d{2}:\d{2}/i;

function normalizarDataBackend(valor: string): string {
  const texto = valor.trim();

  if (!TEM_HORARIO.test(texto) || TEM_FUSO_EXPLICITO.test(texto)) {
    return texto;
  }

  return `${texto}Z`;
}

export function parsearDataBackend(valor: string | Date): Date {
  if (valor instanceof Date) {
    return valor;
  }

  return new Date(normalizarDataBackend(valor));
}

export function formatarDataBrasil(valor: string | Date): string {
  const data = parsearDataBackend(valor);

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_HORARIO_BRASIL,
  }).format(data);
}

export function formatarDataHoraBrasil(valor: string | Date): string {
  const data = parsearDataBackend(valor);

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: FUSO_HORARIO_BRASIL,
    year: 'numeric',
  }).format(data);
}

export function formatarHoraBrasil(valor: string | Date): string {
  const data = parsearDataBackend(valor);

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO_HORARIO_BRASIL,
  }).format(data);
}

export function formatarDataLongaBrasil(valor: string | Date): string {
  const data = parsearDataBackend(valor);

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  const formatado = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    timeZone: FUSO_HORARIO_BRASIL,
    weekday: 'long',
  }).format(data);

  return formatado.charAt(0).toUpperCase() + formatado.slice(1);
}

export function deIsoBackendParaInputDatetimeLocal(iso: string): string {
  const data = parsearDataBackend(iso);

  if (Number.isNaN(data.getTime())) {
    return '';
  }

  const partes = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: FUSO_HORARIO_BRASIL,
    year: 'numeric',
  }).formatToParts(data);

  const obterParte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${obterParte('year')}-${obterParte('month')}-${obterParte('day')}T${obterParte('hour')}:${obterParte('minute')}`;
}

export function deInputDatetimeLocalParaIso(valor: string): string {
  return new Date(valor).toISOString();
}
