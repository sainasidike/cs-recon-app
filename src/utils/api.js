const API_BASE = '/api';

async function post(path, body, isFormData = false) {
  const options = { method: 'POST' };
  if (isFormData) {
    options.body = body;
  } else {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const resp = await fetch(`${API_BASE}${path}`, options);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || '请求失败');
  }
  return resp.json();
}

export async function ocrTable(file) {
  const fd = new FormData();
  fd.append('file', file);
  return post('/ocr/table', fd, true);
}

export async function ocrBankReceipt(file) {
  const fd = new FormData();
  fd.append('file', file);
  return post('/ocr/bank-receipt', fd, true);
}

export async function ocrInvoice(file) {
  const fd = new FormData();
  fd.append('file', file);
  return post('/ocr/invoice', fd, true);
}

export async function aiClassify(headers, sampleRows, fileName) {
  return post('/ai/classify', { headers, sampleRows, fileName });
}

export async function aiAnalyzeDiff(bankEntry, companyEntry, diffType, diffDays, amountDiff) {
  return post('/ai/analyze-diff', { bankEntry, companyEntry, diffType, diffDays, amountDiff });
}

export async function aiSuggestVoucher(entry, unmatchType) {
  return post('/ai/suggest-voucher', { entry, unmatchType });
}

export async function aiReportSummary(reconciliation, matchResults, scenarioContext) {
  return post('/ai/report-summary', { reconciliation, matchResults, scenarioContext });
}

export async function aiExtractTable(ocrResult) {
  return post('/ai/extract-table', { ocrResult });
}
