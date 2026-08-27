export const FUSO_HORARIO_BRASIL = 'America/Sao_Paulo';

const TEM_FUSO_EXPLICITO = /(?:z|[+-]\d{2}:?\d{2})$/i;
const TEM_HORARIO = /t\d{2}:\d{2}/i;
const DATETIME_LOCAL =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

const FORMATADOR_PARTES_BRASIL = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  second: '2-digit',
  timeZone: FUSO_HORARIO_BRASIL,
  year: 'numeric',
});

interface PartesDataHora {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

function obterPartesBrasil(data: Date): PartesDataHora {
  const partes = FORMATADOR_PARTES_BRASIL.formatToParts(data);
  const obter = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value ?? 0);

  return {
    ano: obter('year'),
    mes: obter('month'),
    dia: obter('day'),
    hora: obter('hour'),
    minuto: obter('minute'),
    segundo: obter('second'),
  };
}

function obterOffsetBrasilEmMs(instante: number): number {
  const partes = obterPartesBrasil(new Date(instante));
  const milissegundos = ((instante % 1000) + 1000) % 1000;

  return (
    Date.UTC(
      partes.ano,
      partes.mes - 1,
      partes.dia,
      partes.hora,
      partes.minuto,
      partes.segundo,
      milissegundos,
    ) - instante
  );
}

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
  const correspondencia = DATETIME_LOCAL.exec(valor.trim());

  if (!correspondencia) {
    throw new RangeError('Data e hora local inválidas.');
  }

  const [, anoTexto, mesTexto, diaTexto, horaTexto, minutoTexto, segundoTexto, milissegundoTexto] =
    correspondencia;
  const esperado: PartesDataHora = {
    ano: Number(anoTexto),
    mes: Number(mesTexto),
    dia: Number(diaTexto),
    hora: Number(horaTexto),
    minuto: Number(minutoTexto),
    segundo: Number(segundoTexto ?? 0),
  };
  const milissegundo = Number((milissegundoTexto ?? '').padEnd(3, '0'));
  const horarioCivilUtc = Date.UTC(
    esperado.ano,
    esperado.mes - 1,
    esperado.dia,
    esperado.hora,
    esperado.minuto,
    esperado.segundo,
    milissegundo,
  );

  let instante = horarioCivilUtc;
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const ajustado = horarioCivilUtc - obterOffsetBrasilEmMs(instante);
    if (ajustado === instante) break;
    instante = ajustado;
  }

  const convertido = new Date(instante);
  const partesConvertidas = obterPartesBrasil(convertido);
  const correspondeAoHorarioInformado = Object.entries(esperado).every(
    ([chave, valorEsperado]) =>
      partesConvertidas[chave as keyof PartesDataHora] === valorEsperado,
  );

  if (!correspondeAoHorarioInformado || Number.isNaN(convertido.getTime())) {
    throw new RangeError('Data e hora inexistentes no fuso horário da clínica.');
  }

  return convertido.toISOString();
}
