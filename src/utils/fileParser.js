import * as XLSX from 'xlsx';

const DATE_PATTERNS = [
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
  /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,
  /^\d{4}年\d{1,2}月\d{1,2}日$/,
  /^\d{8}$/,
];

const AMOUNT_PATTERN = /^-?[\d,]+\.?\d*$/;

const DATE_HEADER_KEYWORDS = ['日期', 'date', '交易日期', '记账日期', '业务日期', '时间', '代发日期', '开票日期', '入库日期', '月份'];
const AMOUNT_HEADER_KEYWORDS = ['金额', 'amount', '借方', '贷方', '收入', '支出', '借方金额', '贷方金额', '交易金额', '发生额', '价税合计', '实发金额', '合同金额', '应付金额', '付款金额', '代发金额', '验收金额', '应发合计', '原值', '盘点金额'];
const PRIORITY_AMOUNT_KEYWORDS = ['实发金额', '代发金额', '价税合计', '合同金额', '应付金额', '付款金额', '验收金额', '应发合计', '原值', '盘点金额'];
const DEBIT_KEYWORDS = ['借方', '支出', '付款金额', 'debit', '借方金额'];
const CREDIT_KEYWORDS = ['贷方', '收入', '收款', 'credit', '贷方金额'];
const DESC_KEYWORDS = ['摘要', '备注', '用途', '说明', 'description', 'memo', '附言', '交易摘要', '对方户名'];
const COUNTERPARTY_KEYWORDS = ['对方', '交易对手', '对方户名', '对方名称', '收款人', '付款人', 'counterparty', '姓名', '供应商'];
const BALANCE_KEYWORDS = ['余额', 'balance', '账户余额'];
const REF_KEYWORDS = ['流水号', '交易号', '编号', '凭证号', 'reference', 'ref'];

function normalizeDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return formatDate(val);
  }
  const s = String(val).trim();
  if (/^\d{5}$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  }
  const m1 = s.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?$/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2,'0')}-${m1[3].padStart(2,'0')}`;
  const m2 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;
  return null;
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function normalizeAmount(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const s = String(val).trim().replace(/,/g, '').replace(/￥/g, '').replace(/¥/g, '').replace(/元/g, '');
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

function matchHeader(header, keywords) {
  const h = String(header).toLowerCase().trim();
  return keywords.some(k => h.includes(k.toLowerCase()));
}

function detectColumns(headers) {
  const mapping = { date: -1, amount: -1, debit: -1, credit: -1, description: -1, counterparty: -1, balance: -1, reference: -1 };

  headers.forEach((h, i) => {
    if (mapping.date === -1 && matchHeader(h, DATE_HEADER_KEYWORDS)) mapping.date = i;
    if (matchHeader(h, DEBIT_KEYWORDS) && !matchHeader(h, PRIORITY_AMOUNT_KEYWORDS)) mapping.debit = i;
    if (matchHeader(h, CREDIT_KEYWORDS)) mapping.credit = i;
    if (mapping.description === -1 && matchHeader(h, DESC_KEYWORDS)) mapping.description = i;
    if (mapping.counterparty === -1 && matchHeader(h, COUNTERPARTY_KEYWORDS)) mapping.counterparty = i;
    if (mapping.balance === -1 && matchHeader(h, BALANCE_KEYWORDS)) mapping.balance = i;
    if (mapping.reference === -1 && matchHeader(h, REF_KEYWORDS)) mapping.reference = i;
  });

  let priorityAmountIdx = -1;
  for (const kw of PRIORITY_AMOUNT_KEYWORDS) {
    const idx = headers.findIndex(h => String(h).toLowerCase().trim().includes(kw.toLowerCase()));
    if (idx >= 0) { priorityAmountIdx = idx; break; }
  }

  if (priorityAmountIdx >= 0) {
    mapping.amount = priorityAmountIdx;
    mapping.debit = -1;
    mapping.credit = -1;
  } else {
    headers.forEach((h, i) => {
      if (mapping.amount === -1 && matchHeader(h, AMOUNT_HEADER_KEYWORDS) && !matchHeader(h, DEBIT_KEYWORDS) && !matchHeader(h, CREDIT_KEYWORDS) && !matchHeader(h, BALANCE_KEYWORDS)) mapping.amount = i;
    });
  }

  return mapping;
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (jsonData.length < 2) {
          reject(new Error('文件数据不足'));
          return;
        }

        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          const hasDate = row.some(c => matchHeader(c, DATE_HEADER_KEYWORDS));
          const hasAmount = row.some(c => matchHeader(c, AMOUNT_HEADER_KEYWORDS) || matchHeader(c, DEBIT_KEYWORDS) || matchHeader(c, CREDIT_KEYWORDS));
          if (hasDate && hasAmount) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = jsonData[headerRowIdx].map(h => String(h).trim());
        const colMap = detectColumns(headers);
        const rows = jsonData.slice(headerRowIdx + 1).filter(row => row.some(c => c !== ''));

        const entries = rows.map((row, idx) => {
          const date = colMap.date >= 0 ? normalizeDate(row[colMap.date]) : null;

          let amount = null;
          let direction = 'unknown';

          if (colMap.debit >= 0 && colMap.credit >= 0) {
            const debitVal = normalizeAmount(row[colMap.debit]);
            const creditVal = normalizeAmount(row[colMap.credit]);
            if (debitVal && debitVal !== 0) { amount = Math.abs(debitVal); direction = 'debit'; }
            else if (creditVal && creditVal !== 0) { amount = Math.abs(creditVal); direction = 'credit'; }
          } else if (colMap.debit >= 0 && colMap.credit === -1) {
            const dv = normalizeAmount(row[colMap.debit]);
            if (dv != null && dv !== 0) { amount = Math.abs(dv); direction = 'debit'; }
          } else if (colMap.credit >= 0 && colMap.debit === -1) {
            const cv = normalizeAmount(row[colMap.credit]);
            if (cv != null && cv !== 0) { amount = Math.abs(cv); direction = 'credit'; }
          } else if (colMap.amount >= 0) {
            const raw = normalizeAmount(row[colMap.amount]);
            if (raw !== null) {
              amount = Math.abs(raw);
              direction = raw < 0 ? 'debit' : 'credit';
            }
          }

          const description = colMap.description >= 0 ? String(row[colMap.description] || '').trim() : '';
          const counterparty = colMap.counterparty >= 0 ? String(row[colMap.counterparty] || '').trim() : '';
          const balance = colMap.balance >= 0 ? normalizeAmount(row[colMap.balance]) : null;
          const reference = colMap.reference >= 0 ? String(row[colMap.reference] || '').trim() : '';

          return { id: `row-${idx}`, date, amount, direction, description, counterparty, balance, reference, raw: row };
        }).filter(e => e.date || e.amount);

        resolve({
          fileName: file.name,
          sheetName,
          headers,
          columnMapping: colMap,
          entries,
          totalRows: rows.length,
          parsedRows: entries.length,
        });
      } catch (err) {
        reject(new Error(`解析失败: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'string', cellDates: true });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (jsonData.length < 2) {
          reject(new Error('文件数据不足'));
          return;
        }

        const headers = jsonData[0].map(h => String(h).trim());
        const colMap = detectColumns(headers);
        const rows = jsonData.slice(1).filter(row => row.some(c => c !== ''));

        const entries = rows.map((row, idx) => {
          const date = colMap.date >= 0 ? normalizeDate(row[colMap.date]) : null;
          let amount = null;
          let direction = 'unknown';

          if (colMap.debit >= 0 && colMap.credit >= 0) {
            const dv = normalizeAmount(row[colMap.debit]);
            const cv = normalizeAmount(row[colMap.credit]);
            if (dv && dv !== 0) { amount = Math.abs(dv); direction = 'debit'; }
            else if (cv && cv !== 0) { amount = Math.abs(cv); direction = 'credit'; }
          } else if (colMap.debit >= 0 && colMap.credit === -1) {
            const dv = normalizeAmount(row[colMap.debit]);
            if (dv != null && dv !== 0) { amount = Math.abs(dv); direction = 'debit'; }
          } else if (colMap.credit >= 0 && colMap.debit === -1) {
            const cv = normalizeAmount(row[colMap.credit]);
            if (cv != null && cv !== 0) { amount = Math.abs(cv); direction = 'credit'; }
          } else if (colMap.amount >= 0) {
            const raw = normalizeAmount(row[colMap.amount]);
            if (raw !== null) { amount = Math.abs(raw); direction = raw < 0 ? 'debit' : 'credit'; }
          }

          return {
            id: `row-${idx}`,
            date,
            amount,
            direction,
            description: colMap.description >= 0 ? String(row[colMap.description] || '').trim() : '',
            counterparty: colMap.counterparty >= 0 ? String(row[colMap.counterparty] || '').trim() : '',
            balance: colMap.balance >= 0 ? normalizeAmount(row[colMap.balance]) : null,
            reference: colMap.reference >= 0 ? String(row[colMap.reference] || '').trim() : '',
            raw: row,
          };
        }).filter(e => e.date || e.amount);

        resolve({ fileName: file.name, sheetName, headers, columnMapping: colMap, entries, totalRows: rows.length, parsedRows: entries.length });
      } catch (err) {
        reject(new Error(`解析失败: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (['xlsx', 'xls'].includes(ext)) return parseExcelFile(file);
  if (ext === 'csv') return parseCSVFile(file);
  if (ext === 'pdf' || ['jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(ext)) {
    return parseWithOCR(file);
  }
  throw new Error(`不支持的文件格式: ${ext}`);
}

function compressImage(file, maxSize = 1600, quality = 0.8) {
  return new Promise((resolve) => {
    if (file.type === 'application/pdf') { resolve(file); return; }
    if (file.size < 200 * 1024) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) { resolve(file); return; }
      const scale = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function parseWithOCR(file) {
  const { ocrTable, aiExtractTable } = await import('./api.js');

  const processedFile = await compressImage(file);

  let ocrResult;
  try {
    ocrResult = await ocrTable(processedFile);
  } catch (e) {
    return {
      fileName: file.name, fileType: file.name.split('.').pop().toLowerCase(),
      needsOCR: true, ocrFailed: true, entries: [],
      headers: [], columnMapping: {},
      message: `OCR 识别失败: ${e.message}`,
    };
  }

  if (!ocrResult?.result?.pages?.length) {
    return {
      fileName: file.name, fileType: file.name.split('.').pop().toLowerCase(),
      needsOCR: true, ocrFailed: true, entries: [],
      headers: [], columnMapping: {},
      message: 'OCR 未识别到表格内容',
    };
  }

  const tables = [];
  for (const page of ocrResult.result.pages) {
    for (const table of (page.tables || [])) {
      const rows = [];
      const rowCount = table.table_rows || 0;
      const colCount = table.table_cols || 0;
      for (let r = 0; r < rowCount; r++) {
        rows.push(new Array(colCount).fill(''));
      }
      for (const cell of (table.table_cells || [])) {
        if (cell.start_row < rowCount && cell.start_col < colCount) {
          rows[cell.start_row][cell.start_col] = (cell.text || '').trim();
        }
      }
      tables.push(rows);
    }
  }

  if (tables.length === 0) {
    return {
      fileName: file.name, fileType: file.name.split('.').pop().toLowerCase(),
      needsOCR: true, ocrFailed: true, entries: [],
      headers: [], columnMapping: {},
      message: 'OCR 未识别到表格结构',
    };
  }

  const allRows = tables.flat();

  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, allRows.length); i++) {
    const row = allRows[i];
    const hasDate = row.some(c => matchHeader(c, DATE_HEADER_KEYWORDS));
    const hasAmount = row.some(c => matchHeader(c, AMOUNT_HEADER_KEYWORDS) || matchHeader(c, DEBIT_KEYWORDS) || matchHeader(c, CREDIT_KEYWORDS));
    if (hasDate && hasAmount) { headerRowIdx = i; break; }
  }

  const headers = allRows[headerRowIdx].map(h => String(h).trim());
  const colMap = detectColumns(headers);
  const dataRows = allRows.slice(headerRowIdx + 1).filter(row => row.some(c => c !== ''));

  const entries = dataRows.map((row, idx) => {
    const date = colMap.date >= 0 ? normalizeDate(row[colMap.date]) : null;
    let amount = null, direction = 'unknown';
    if (colMap.debit >= 0 && colMap.credit >= 0) {
      const dv = normalizeAmount(row[colMap.debit]);
      const cv = normalizeAmount(row[colMap.credit]);
      if (dv && dv !== 0) { amount = Math.abs(dv); direction = 'debit'; }
      else if (cv && cv !== 0) { amount = Math.abs(cv); direction = 'credit'; }
    } else if (colMap.amount >= 0) {
      const raw = normalizeAmount(row[colMap.amount]);
      if (raw !== null) { amount = Math.abs(raw); direction = raw < 0 ? 'debit' : 'credit'; }
    }
    return {
      id: `ocr-${idx}`, date, amount, direction,
      description: colMap.description >= 0 ? String(row[colMap.description] || '').trim() : '',
      counterparty: colMap.counterparty >= 0 ? String(row[colMap.counterparty] || '').trim() : '',
      balance: colMap.balance >= 0 ? normalizeAmount(row[colMap.balance]) : null,
      reference: colMap.reference >= 0 ? String(row[colMap.reference] || '').trim() : '',
      raw: row,
    };
  }).filter(e => e.date || e.amount);

  if (entries.length > 0) {
    return {
      fileName: file.name,
      fileType: file.name.split('.').pop().toLowerCase(),
      ocrProcessed: true,
      headers, columnMapping: colMap,
      entries, totalRows: dataRows.length, parsedRows: entries.length,
    };
  }

  let aiResult;
  try {
    aiResult = await aiExtractTable({ rows: allRows.slice(0, 50), fileName: file.name });
  } catch {
    aiResult = null;
  }

  if (aiResult?.entries?.length > 0) {
    const aiEntries = aiResult.entries.map((e, idx) => ({
      id: `ocr-${idx}`,
      date: e.date || null,
      amount: Math.abs(e.debit || e.credit || 0),
      direction: e.debit ? 'debit' : e.credit ? 'credit' : 'unknown',
      description: e.description || '',
      counterparty: e.counterparty || '',
      balance: e.balance ?? null,
      reference: '',
      raw: e,
    })).filter(e => e.date || e.amount);

    return {
      fileName: file.name,
      fileType: file.name.split('.').pop().toLowerCase(),
      ocrProcessed: true,
      headers: Object.keys(aiResult.entries[0] || {}),
      columnMapping: {},
      entries: aiEntries,
      totalRows: allRows.length,
      parsedRows: aiEntries.length,
      aiDocType: aiResult.docType || 'unknown',
    };
  }

  return {
    fileName: file.name,
    fileType: file.name.split('.').pop().toLowerCase(),
    ocrProcessed: true,
    headers, columnMapping: colMap,
    entries: [], totalRows: dataRows.length, parsedRows: 0,
  };
}

export function classifyDocumentLocal(parsed) {
  if (parsed.aiDocType && parsed.aiDocType !== 'unknown') return parsed.aiDocType;

  const headers = (parsed.headers || []).map(h => String(h).toLowerCase());
  const joined = headers.join(' ');
  const sampleText = (parsed.entries || []).slice(0, 5).map(e => (e.description || '')).join(' ').toLowerCase();
  const contentText = joined + ' ' + sampleText;

  if (joined.includes('发票号') || joined.includes('发票代码') || joined.includes('税率') || joined.includes('价税合计')) return 'invoice';
  if (joined.includes('合同编号') || joined.includes('合同金额') || joined.includes('付款条件') || joined.includes('交货期')) return 'contract';
  if (joined.includes('验收单号') || joined.includes('验收金额') || joined.includes('验收结论') || (joined.includes('入库') && joined.includes('日期'))) return 'receipt';
  if (joined.includes('报销单号') || joined.includes('报销人') || joined.includes('报销日期')) return 'expense';
  if (joined.includes('基本工资') || joined.includes('实发金额') || joined.includes('应发合计') || joined.includes('个税')) return 'payroll';
  if (joined.includes('代发') && (joined.includes('收款人') || joined.includes('收款账号'))) return 'bank_statement';
  if ((joined.includes('盘点') || joined.includes('实盘数量') || joined.includes('面额') || joined.includes('账实') || joined.includes('盘点状态'))) return 'inventory';
  if (joined.includes('资产编号') || joined.includes('原值') || joined.includes('累计折旧') || joined.includes('净值')) return 'asset_ledger';
  if (joined.includes('栏次') || (joined.includes('纳税') && joined.includes('申报')) || (joined.includes('税种方向') && joined.includes('申报'))) return 'tax';
  if (joined.includes('销项税') || joined.includes('进项税') || (joined.includes('税种方向') && joined.includes('凭证'))) return 'tax_detail';
  if (joined.includes('经办人') && joined.includes('余额') && (joined.includes('收入') || joined.includes('支出')) && !joined.includes('盘点')) return 'cashbook';
  if (joined.includes('对方户名') && joined.includes('借方') && !joined.includes('余额') && !joined.includes('贷方')) return 'payment';
  if (joined.includes('对方户名') || joined.includes('流水') || (joined.includes('余额') && joined.includes('借方') && joined.includes('贷方') && joined.includes('对方'))) return 'bank_statement';
  if ((joined.includes('余额') && joined.includes('借方') && joined.includes('贷方'))) return 'bank_statement';
  if (joined.includes('凭证号') || joined.includes('科目')) return 'company_ledger';
  if (joined.includes('付款状态') && joined.includes('客户名称')) return 'ap_ar_statement';
  if (joined.includes('应付') || joined.includes('应收')) return 'company_ledger';

  if (contentText.includes('销项') && contentText.includes('进项') && joined.includes('凭证')) return 'tax_detail';
  if (contentText.includes('销项') && contentText.includes('进项') && (joined.includes('申报') || joined.includes('纳税'))) return 'tax';
  if (contentText.includes('验收') && contentText.includes('供应商')) return 'receipt';
  if (contentText.includes('合同') && contentText.includes('供应商')) return 'contract';
  if (contentText.includes('报销') && contentText.includes('审批')) return 'expense';

  const fileName = (parsed.fileName || '').toLowerCase();
  if (fileName.includes('回单') || fileName.includes('付款')) return 'payment';
  if (fileName.includes('bank') || fileName.includes('银行') || fileName.includes('流水')) return 'bank_statement';
  if (fileName.includes('ledger') || fileName.includes('账簿') || fileName.includes('记账')) return 'company_ledger';
  if (fileName.includes('invoice') || fileName.includes('发票')) return 'invoice';
  if (fileName.includes('contract') || fileName.includes('合同')) return 'contract';
  if (fileName.includes('receipt') || fileName.includes('入库') || fileName.includes('验收')) return 'receipt';
  if (fileName.includes('expense') || fileName.includes('报销')) return 'expense';
  if (fileName.includes('payroll') || fileName.includes('工资')) return 'payroll';
  if (fileName.includes('inventory') || fileName.includes('盘点')) return 'inventory';
  if (fileName.includes('tax') || fileName.includes('税')) return 'tax';

  const hasBalance = parsed.columnMapping && parsed.columnMapping.balance >= 0;
  if (hasBalance) return 'bank_statement';

  return 'unknown';
}

const VALID_DOC_TYPES = new Set([
  'bank_statement', 'company_ledger', 'invoice', 'contract', 'receipt',
  'expense', 'payment', 'payroll', 'inventory', 'tax', 'tax_detail',
  'cashbook', 'asset_ledger', 'ap_ar_statement',
]);

export async function classifyDocument(parsed) {
  const localResult = classifyDocumentLocal(parsed);

  try {
    const { aiClassify } = await import('./api.js');
    const sampleRows = (parsed.entries || []).slice(0, 3).map(e => ({
      date: e.date, description: e.description, amount: e.amount, direction: e.direction,
    }));
    const result = await aiClassify(parsed.headers || [], sampleRows, parsed.fileName || '');
    if (result?.type && result.type !== 'unknown' && result.confidence > 60 && VALID_DOC_TYPES.has(result.type)) {
      return result.type;
    }
  } catch {
    // AI 不可用时静默降级
  }

  return localResult;
}

export function detectDuplicates(entries) {
  const dupes = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (a.date && b.date && a.date === b.date &&
          a.direction === b.direction &&
          a.amount != null && b.amount != null &&
          Math.abs(a.amount - b.amount) < 0.01) {
        const descA = (a.description || '').toLowerCase();
        const descB = (b.description || '').toLowerCase();
        const similar = descA === descB || descA.includes(descB) || descB.includes(descA);
        if (similar || (!a.description && !b.description)) {
          dupes.push({ index1: i, index2: j, entry1: a, entry2: b });
        }
      }
    }
  }
  return dupes;
}

export function validateEntries(entries) {
  const warnings = [];

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].date && entries[i - 1].date && entries[i].date < entries[i - 1].date) {
      warnings.push({
        type: 'date_order', severity: 'warning',
        message: `第${i + 1}行日期(${entries[i].date})早于第${i}行(${entries[i - 1].date})，日期顺序异常`,
        rowIndex: i,
      });
    }
  }

  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1], curr = entries[i];
    if (prev.balance != null && curr.balance != null && curr.amount != null) {
      const expected = curr.direction === 'credit'
        ? prev.balance + curr.amount
        : prev.balance - curr.amount;
      if (Math.abs(expected - curr.balance) > 0.01) {
        warnings.push({
          type: 'balance_break', severity: 'error',
          message: `第${i + 1}行余额不连续: 预期 ¥${expected.toFixed(2)}，实际 ¥${curr.balance.toFixed(2)}`,
          rowIndex: i, expected, actual: curr.balance,
        });
      }
    }
  }

  entries.forEach((e, i) => {
    if (!e.date) {
      warnings.push({ type: 'missing_date', severity: 'warning', message: `第${i + 1}行缺少日期`, rowIndex: i });
    }
    if (e.amount == null || e.amount === 0) {
      warnings.push({ type: 'zero_amount', severity: 'warning', message: `第${i + 1}行金额为空或0`, rowIndex: i });
    }
    if (e.direction === 'unknown') {
      warnings.push({ type: 'unknown_direction', severity: 'warning', message: `第${i + 1}行无法判断借贷方向`, rowIndex: i });
    }
  });

  return warnings;
}
