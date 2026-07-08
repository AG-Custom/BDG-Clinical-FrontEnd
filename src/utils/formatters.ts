import { formatarDataBrasil } from '@/utils/data-hora';

export function formatarData(value: string | Date): string {
  return formatarDataBrasil(value);
}

export function formatarDocumento(value: string): string {
  return value.replace(/\D/g, '');
}
