import type { ClinicalEvent } from '@/types/entidades/prontuario';
import { formatarDataBrasil, formatarHoraBrasil } from '@/utils/data-hora';

const VISUAL_EVENTO: Record<string, { icone: string; categoria: string }> = {
  AtendimentoCriado: { icone: 'play_circle', categoria: 'Atendimento' },
  AtendimentoAtualizado: { icone: 'edit', categoria: 'Atendimento' },
  AtendimentoFinalizado: { icone: 'check_circle', categoria: 'Atendimento' },
  AnotacaoCriada: { icone: 'notes', categoria: 'Anotação' },
  AnotacaoAtualizada: { icone: 'notes', categoria: 'Anotação' },
  AnamneseCriada: { icone: 'assignment', categoria: 'Anamnese' },
  AnamneseAtualizada: { icone: 'assignment', categoria: 'Anamnese' },
  AvaliacaoCriada: { icone: 'monitor_weight', categoria: 'Avaliação' },
  AvaliacaoAtualizada: { icone: 'monitor_weight', categoria: 'Avaliação' },
  ExameEnviado: { icone: 'lab_profile', categoria: 'Exame' },
  FotoAdicionada: { icone: 'photo_camera', categoria: 'Foto' },
  DocumentoAnexado: { icone: 'description', categoria: 'Documento' },
  VentaCalculada: { icone: 'calculate', categoria: 'VENTA' },
  RegraBolsoCalculada: { icone: 'restaurant', categoria: 'Nutrição' },
  ProntuarioAtualizado: { icone: 'folder_shared', categoria: 'Prontuário' },
};

export type ItemHistoricoClinico = {
  id: string;
  icone: string;
  categoria: string;
  titulo: string;
  resumo: string | null;
  hora: string;
  profissional: string;
};

export type GrupoHistoricoClinico = {
  data: string;
  itens: ItemHistoricoClinico[];
};

export function agruparEventosClinicos(eventos: ClinicalEvent[]): GrupoHistoricoClinico[] {
  const grupos: GrupoHistoricoClinico[] = [];
  const indicePorData = new Map<string, number>();

  for (const evento of eventos) {
    const data = formatarDataBrasil(evento.data);
    const visual = VISUAL_EVENTO[evento.tipo] ?? { icone: 'event_note', categoria: 'Registro' };
    const item: ItemHistoricoClinico = {
      id: evento.id,
      icone: visual.icone,
      categoria: visual.categoria,
      titulo: evento.titulo,
      resumo: evento.resumo,
      hora: formatarHoraBrasil(evento.data),
      profissional: evento.funcionarioNome,
    };
    const indice = indicePorData.get(data);

    if (indice == null) {
      indicePorData.set(data, grupos.length);
      grupos.push({ data, itens: [item] });
      continue;
    }

    grupos[indice].itens.push(item);
  }

  return grupos;
}
