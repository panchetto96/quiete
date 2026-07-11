import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Episode, episodeTypeInfo } from '../types/episode';
import { formatDuration } from './format';
import { computeStats } from './stats';
import type { AppSettings } from '../db/database';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' });
}

export function buildFascicoloHtml(episodes: Episode[], settings?: AppSettings): string {
  const sorted = [...episodes].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const stats = computeStats(episodes, settings, settings);

  const rows = sorted
    .map(
      (e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDateTime(e.startedAt)}</td>
        <td>${episodeTypeInfo(e.type).label}</td>
        <td>${formatDuration(e.durationMinutes)}</td>
        <td>${escapeHtml(e.notes ?? '')}</td>
        <td>${e.audioUri ? 'Sì' : 'No'}</td>
      </tr>`
    )
    .join('');

  const nightHoursLabel = `${String(stats.nightStartHour).padStart(2, '0')}:00-${String(
    stats.nightEndHour
  ).padStart(2, '0')}:00`;
  // La fonte viene citata solo se coincide davvero con gli orari attuali (vedi
  // SettingsScreen): se l'utente ha modificato gli orari senza indicare una propria
  // ordinanza, non va attribuita una fonte che quegli orari non prevede più.
  const comuneLine = settings?.comuneFonte
    ? `Fascia di riposo notturno di riferimento: ${nightHoursLabel}${
        settings.comune ? ` (Comune di ${escapeHtml(settings.comune)})` : ''
      } — fonte: ${escapeHtml(settings.comuneFonte)}.`
    : settings?.comune
    ? `Fascia di riposo notturno di riferimento: ${nightHoursLabel} (Comune di ${escapeHtml(
        settings.comune
      )}; valore personalizzato, nessuna fonte indicata).`
    : `Fascia di riposo notturno di riferimento: ${nightHoursLabel} (valore generico; personalizzabile nelle impostazioni in base al proprio comune).`;

  const dayRestLine = stats.dayRestEnabled
    ? `Fascia di riposo pomeridiano di riferimento: ${String(stats.dayStartHour).padStart(2, '0')}:${String(
        stats.dayStartMinute
      ).padStart(2, '0')}-${String(stats.dayEndHour).padStart(2, '0')}:${String(stats.dayEndMinute).padStart(
        2,
        '0'
      )} (${stats.dayRestPercentage}% degli episodi).`
    : '';

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A2233; padding: 32px; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin: 20px 0 8px; }
        .sub { color: #5C6474; font-size: 12px; margin-bottom: 16px; }
        .summary { background: #ECEAE2; border-radius: 8px; padding: 12px 16px; font-size: 12px; margin-bottom: 20px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #D9D6CB; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #ECEAE2; }
        .disclaimer { margin-top: 24px; font-size: 10px; color: #5C6474; line-height: 1.5; }
      </style>
    </head>
    <body>
      <h1>Fascicolo &mdash; Diario dei rumori molesti</h1>
      <p class="sub">Generato da Quiete il ${new Date().toLocaleString('it-IT')} &middot; ${sorted.length} episodio${sorted.length === 1 ? '' : 'i'} registrat${sorted.length === 1 ? 'o' : 'i'}</p>

      <div class="summary">
        <strong>Riepilogo</strong><br/>
        ${stats.total} episodi documentati, ${stats.nightPercentage}% nella fascia notturna (${nightHoursLabel}).<br/>
        ${comuneLine}${dayRestLine ? `<br/>${dayRestLine}` : ''}
      </div>

      <table>
        <thead>
          <tr><th>#</th><th>Data e ora</th><th>Tipo</th><th>Durata</th><th>Note</th><th>Audio allegato</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="disclaimer">
        Questo documento è generato da Quiete come strumento di documentazione personale.
        Non costituisce consulenza legale. Ai sensi dell'art. 2712 c.c. le riproduzioni meccaniche
        formano piena prova dei fatti rappresentati se la parte contro cui sono prodotte non ne
        disconosce la conformità; il valore probatorio finale di ciascun elemento resta comunque
        rimesso alla valutazione dell'autorità competente.
      </p>
    </body>
  </html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function exportFascicolo(episodes: Episode[], settings?: AppSettings): Promise<void> {
  const html = buildFascicoloHtml(episodes, settings);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Condividi fascicolo',
    });
  }
}
