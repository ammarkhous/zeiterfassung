import { DOCX_MIME, TemplateError, renderDocx, validateTemplate } from '@/lib/docxTemplate';
import { base64ToArrayBuffer, getTemplate } from '@/lib/templates';
import { ReportTemplateKind } from '@/types';

// Fills the uploaded Word template for this report type with `data` and returns the
// finished .docx. The template comes from the local cache (so this works offline)
// and is validated again here, because it is stored data and never trusted at render
// time. Throws a TemplateError; callers fall back to the standard PDF.
export const renderWordReport = async (
  kind: ReportTemplateKind,
  data: Record<string, unknown>
): Promise<Blob> => {
  const template = await getTemplate(kind);
  if (!template) throw new TemplateError('Es ist keine Vorlage vorhanden.');

  const bytes = base64ToArrayBuffer(template.content);
  await validateTemplate(bytes, kind);
  const filled = await renderDocx(bytes, data);
  return new Blob([filled as BlobPart], { type: DOCX_MIME });
};
