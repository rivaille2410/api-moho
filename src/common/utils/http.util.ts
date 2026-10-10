import type { Response } from 'express';

export function sendExcelFile(
  res: Response,
  filename: string,
  buffer: Buffer,
): void {
  res.set({
    'Content-Type':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(buffer);
}

export function excelFilename(prefix: string): string {
  return `${prefix}-${Date.now()}.xlsx`;
}
