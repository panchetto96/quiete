import { Share } from 'react-native';
import { Episode, episodeTypeInfo } from '../types/episode';
import { computeStats } from './stats';
import type { AppSettings } from '../db/database';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Genera una bozza di diffida in testo semplice, non un PDF: va letta, personalizzata
 * con i propri dati e quelli del destinatario, ed eventualmente rivista da un legale
 * prima dell'invio. Non è consulenza legale, è un punto di partenza.
 */
export function buildDiffidaText(episodes: Episode[], settings: AppSettings): string {
  const stats = computeStats(episodes, settings);
  const oldest = episodes.reduce((min, e) => (e.startedAt < min.startedAt ? e : min), episodes[0]);
  const newest = episodes.reduce((max, e) => (e.startedAt > max.startedAt ? e : max), episodes[0]);

  const nightNote =
    stats.nightPercentage >= 50
      ? `La maggior parte degli episodi (${stats.nightPercentage}%) si colloca nella fascia di riposo notturno` +
        (settings.comune ? ` prevista dal regolamento comunale di ${settings.comune}` : '') +
        ` (dalle ${String(settings.nightStartHour).padStart(2, '0')}:00 alle ${String(
          settings.nightEndHour
        ).padStart(2, '0')}:00).`
      : '';

  const typeSummary = stats.byType.map((t) => `${t.label.toLowerCase()} (${t.count})`).join(', ');

  const recentEpisodes = [...episodes]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 10)
    .map((e) => `- ${formatDateTime(e.startedAt)}: ${episodeTypeInfo(e.type).label}${e.notes ? ` — ${e.notes}` : ''}`)
    .join('\n');

  return `[Nome e cognome del mittente]
[Indirizzo del mittente]
[Data odierna]

Alla cortese attenzione di
[Nome del destinatario, se noto — altrimenti "Al condomino/i dell'immobile sito in ..."]
[Indirizzo del destinatario]

Oggetto: diffida a cessare le immissioni sonore moleste

Con la presente, la/il sottoscritta/o [nome del mittente], residente in [indirizzo], desidera segnalare quanto segue.

A partire dal ${formatDate(oldest?.startedAt ?? new Date().toISOString())} e fino al ${formatDate(
    newest?.startedAt ?? new Date().toISOString()
  )}, si sono verificati ripetuti episodi di rumori molesti provenienti dall'unità immobiliare di Vostra proprietà/conduzione, per un totale di ${
    stats.total
  } episodi documentati (${typeSummary}).${nightNote ? `\n\n${nightNote}` : ''}

Di seguito un estratto degli episodi più recenti:
${recentEpisodes}

Tali immissioni sonore superano, per intensità, frequenza e orario, la normale tollerabilità di cui all'art. 844 del Codice Civile, arrecando disturbo alla quiete e al riposo del sottoscritto e del proprio nucleo familiare.

Con la presente si diffida formalmente dal continuare a produrre le immissioni sonore sopra descritte, invitando alla massima collaborazione per una soluzione bonaria della questione. Si precisa che, in mancanza di riscontro o di cessazione del disturbo, si valuterà il ricorso agli strumenti di tutela previsti dalla legge, ivi compreso il procedimento di mediazione civile obbligatoria in materia condominiale (D.Lgs. 28/2010).

Si resta a disposizione per un confronto diretto, nella speranza di poter risolvere la questione con reciproca soddisfazione.

Distinti saluti,

[Firma]

---
Bozza generata da Quiete sulla base del diario degli episodi registrati. Non costituisce consulenza legale: si raccomanda di personalizzare i dati mancanti e, per situazioni complesse, di far rivedere il testo a un legale prima dell'invio.`;
}

export async function shareDiffida(episodes: Episode[], settings: AppSettings): Promise<void> {
  const text = buildDiffidaText(episodes, settings);
  await Share.share({ message: text });
}
