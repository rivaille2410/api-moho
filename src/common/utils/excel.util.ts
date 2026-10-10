import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import { MAX_EXPORT_ROWS } from '@/common/constants/export.constants';

export type ExcelColumn = Partial<ExcelJS.Column> & {
  header: string;
  key: string;
};

export function assertExportLimit(
  totalItems: number,
  max = MAX_EXPORT_ROWS,
): void {
  if (totalItems > max) {
    throw new BadRequestException({
      code: 'EXPORT_TOO_LARGE',
      message: `Export exceeds ${max} rows. Please narrow your filters.`,
    });
  }
}

export async function createExcelBuffer(params: {
  sheetName: string;
  columns: ExcelColumn[];
  rows: Array<Record<string, unknown>>;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(params.sheetName);

  sheet.columns = params.columns;
  sheet.getRow(1).font = { bold: true };
  params.rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
