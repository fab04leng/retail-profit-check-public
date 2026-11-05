import type { Finding } from '../analysis/types';
import { safeExcelText, toCsv } from '../core/exportCsv';
import type { I18n } from '../i18n';
import { RULES_BY_ID } from '../rules/rules.config';
import { findingMessage } from './components/FindingCard';
import { downloadBlob, downloadText } from './download';
import type { Review } from './state';

function rows(findings: Finding[], reviews: Record<string, Review>, i18n: I18n): (string | number)[][] {
  const { t } = i18n;
  const header = ['Rule', 'Rule title', 'Area', 'Severity', 'Subject', 'Finding', 'Amount (RM)', 'Amount means', 'Estimate', 'Review status', 'Review note', 'Reviewed on', 'Evidence rows'];
  return [
    header,
    ...findings.map((f) => {
      const r = reviews[f.id];
      return [
        f.ruleId,
        t(`ruleText.${f.ruleId}.title`),
        RULES_BY_ID[f.ruleId].area,
        f.severity,
        f.subject,
        findingMessage(f, t, i18n.date),
        f.amount ?? '',
        f.amountKind ? t(`amountKind.${f.amountKind}`) : '',
        f.estimate ? 'yes' : 'no',
        r ? t(`review.${r.status}`) : t('review.unreviewed'),
        r?.note ?? '',
        r?.at ?? '',
        f.evidence.map((e) => `${e.file}: ${e.rows.join(' ')}`).join(' | '),
      ];
    }),
  ];
}

/** CSV for the accountant. Every text cell is guarded against formula injection. */
export function exportFindingsCsv(findings: Finding[], reviews: Record<string, Review>, i18n: I18n): void {
  downloadText('findings.csv', toCsv(rows(findings, reviews, i18n)), 'text/csv');
}

/** Excel file: text cells written as strings (never formulas) and guarded; amounts as numbers. */
export async function exportFindingsXlsx(findings: Finding[], reviews: Record<string, Review>, i18n: I18n): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal');
  const data = rows(findings, reviews, i18n).map((r, i) =>
    r.map((v) => (typeof v === 'number' ? { value: v, type: Number, format: '#,##0.00' } : { value: safeExcelText(v), type: String, fontWeight: i === 0 ? ('bold' as const) : undefined })),
  );
  const blob = await writeXlsxFile(data as never, { sheet: 'Findings' } as never).toBlob();
  downloadBlob('findings.xlsx', blob);
}
