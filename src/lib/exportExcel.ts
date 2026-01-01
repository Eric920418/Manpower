import * as XLSX from 'xlsx';

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  // 自訂格式化函數
  format?: (value: any, row: any) => string | number;
}

interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: any[];
}

/**
 * 將資料導出為 Excel 檔案
 */
export function exportToExcel({ filename, sheetName = 'Sheet1', columns, data }: ExportOptions): void {
  // 建立表頭
  const headers = columns.map(col => col.header);

  // 建立資料行
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      // 如果有自訂格式化函數，使用它
      if (col.format) {
        return col.format(value, item);
      }
      // 處理 null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // 處理日期
      if (value instanceof Date) {
        return value.toLocaleString('zh-TW');
      }
      // 處理陣列
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      // 處理物件
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
  });

  // 組合表頭和資料
  const worksheetData = [headers, ...rows];

  // 建立工作表
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // 設定欄寬
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  worksheet['!cols'] = colWidths;

  // 建立工作簿
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 產生檔案名稱（加上日期）
  const date = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${date}.xlsx`;

  // 下載檔案
  XLSX.writeFile(workbook, fullFilename);
}

/**
 * 格式化日期為台灣格式
 */
export function formatDateForExcel(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * 格式化布林值
 */
export function formatBooleanForExcel(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value ? '是' : '否';
}
