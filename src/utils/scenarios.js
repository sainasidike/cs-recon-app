export const SCENARIOS = [
  {
    id: 'bank_recon',
    name: '银行对账',
    icon: '🏦',
    desc: '银行流水 vs 企业账簿',
    frequency: '月度',
    complexity: '低',
    sideA: { key: 'bank', label: '银行流水', shortLabel: '银行' },
    sideB: { key: 'company', label: '企业账簿', shortLabel: '企业' },
    sideC: null,
    documents: '银行对账单、银行回单、记账凭证',
    roles: [
      { value: 'sideA', label: '银行流水' },
      { value: 'sideB', label: '企业账簿' },
      { value: 'auto', label: '自动识别' },
    ],
    hasBalance: true,
    balanceLabels: { sideA: '银行对账单期末余额', sideB: '企业账面期末余额' },
    reportTitle: '银行余额调节表',
    matchConfig: {
      primaryField: 'amount',
      dateWeight: 1,
      amountWeight: 1,
      textWeight: 0.5,
      counterpartyWeight: 0.3,
      exactDateTolerance: 0,
      exactAmountTolerance: 0.01,
      fuzzyDateTolerance: 3,
      semanticDateTolerance: 7,
      amountTolerance: 0.05,
    },
    aiContext: '银行对账：比对银行流水和企业账簿，找出未达账项',
  },
  {
    id: 'ap_ar_recon',
    name: '往来对账',
    icon: '🤝',
    desc: '企业 vs 供应商/客户',
    frequency: '月度/季度',
    complexity: '中',
    sideA: { key: 'enterprise', label: '企业台账', shortLabel: '企业' },
    sideB: { key: 'partner', label: '供应商/客户对账单', shortLabel: '对方' },
    sideC: null,
    documents: '采购单、送货单、对账单、发票',
    roles: [
      { value: 'sideA', label: '企业台账' },
      { value: 'sideB', label: '对方对账单' },
      { value: 'auto', label: '自动识别' },
    ],
    hasBalance: true,
    balanceLabels: { sideA: '企业应付/应收余额', sideB: '对方对账单余额' },
    reportTitle: '往来对账调节表',
    matchConfig: {
      primaryField: 'amount',
      dateWeight: 0.8,
      amountWeight: 1,
      textWeight: 0.6,
      counterpartyWeight: 1,
      exactDateTolerance: 0,
      fuzzyDateTolerance: 5,
      semanticDateTolerance: 15,
      amountTolerance: 0.05,
    },
    aiContext: '往来对账：比对企业应付/应收台账与供应商/客户对账单，找出差异项',
  },
  {
    id: 'invoice_verify',
    name: '发票核验',
    icon: '🧾',
    desc: '发票 vs 合同 vs 入库单',
    frequency: '逐笔',
    complexity: '高',
    sideA: { key: 'invoice', label: '增值税发票', shortLabel: '发票' },
    sideB: { key: 'contract', label: '合同/采购订单', shortLabel: '合同' },
    sideC: { key: 'receipt', label: '入库验收单', shortLabel: '入库' },
    documents: '增值税发票、合同、入库验收单',
    roles: [
      { value: 'sideA', label: '发票' },
      { value: 'sideB', label: '合同/订单' },
      { value: 'sideC', label: '入库验收单' },
      { value: 'auto', label: '自动识别' },
    ],
    hasBalance: false,
    balanceLabels: null,
    reportTitle: '三单匹配核验报告',
    matchConfig: {
      primaryField: 'amount',
      dateWeight: 0.3,
      amountWeight: 1,
      textWeight: 0.8,
      counterpartyWeight: 1,
      exactDateTolerance: 15,
      fuzzyDateTolerance: 30,
      semanticDateTolerance: 60,
      amountTolerance: 0.05,
    },
    aiContext: '发票核验：三单匹配，比对发票、合同/采购订单、入库验收单的一致性',
  },
  {
    id: 'expense_recon',
    name: '费用报销对账',
    icon: '💳',
    desc: '报销单 vs 发票 vs 银行付款',
    frequency: '随时',
    complexity: '中',
    sideA: { key: 'expense', label: '费用报销单', shortLabel: '报销单' },
    sideB: { key: 'invoice', label: '发票', shortLabel: '发票' },
    sideC: { key: 'payment', label: '银行付款记录', shortLabel: '付款' },
    documents: '费用报销单、发票、出差审批单、银行回单',
    roles: [
      { value: 'sideA', label: '报销单' },
      { value: 'sideB', label: '发票' },
      { value: 'sideC', label: '银行付款' },
      { value: 'auto', label: '自动识别' },
    ],
    hasBalance: false,
    balanceLabels: null,
    reportTitle: '费用报销核对报告',
    matchConfig: {
      primaryField: 'amount',
      dateWeight: 0.3,
      amountWeight: 1,
      textWeight: 0.7,
      counterpartyWeight: 0.5,
      exactDateTolerance: 10,
      fuzzyDateTolerance: 20,
      semanticDateTolerance: 30,
      amountTolerance: 0.05,
    },
    aiContext: '费用报销对账：比对报销单、发票和银行付款记录的一致性',
  },
  {
    id: 'cash_recon',
    name: '现金对账',
    icon: '💵',
    desc: '现金日记账 vs 实际盘点',
    frequency: '日/周',
    complexity: '低',
    sideA: { key: 'cashbook', label: '现金日记账', shortLabel: '日记账' },
    sideB: { key: 'count', label: '现金盘点表', shortLabel: '盘点' },
    sideC: null,
    documents: '收据、付款凭证、现金盘点表',
    roles: [
      { value: 'sideA', label: '现金日记账' },
      { value: 'sideB', label: '盘点表/凭证' },
      { value: 'auto', label: '自动识别' },
    ],
    hasBalance: true,
    balanceLabels: { sideA: '现金日记账余额', sideB: '实际盘点金额' },
    reportTitle: '现金盘点调节表',
    matchConfig: {
      primaryField: 'amount',
      dateWeight: 1,
      amountWeight: 1,
      textWeight: 0.4,
      counterpartyWeight: 0.2,
      exactDateTolerance: 0,
      fuzzyDateTolerance: 1,
      semanticDateTolerance: 3,
      amountTolerance: 0.01,
    },
    aiContext: '现金对账：比对现金日记账和实际盘点金额，找出现金长短款',
  },
  {
    id: 'tax_recon',
    name: '税务对账',
    icon: '📋',
    desc: '企业账簿 vs 税务申报',
    frequency: '月度/季度',
    complexity: '高',
    sideA: { key: 'book', label: '企业账簿', shortLabel: '账簿' },
    sideB: { key: 'tax', label: '税务申报表', shortLabel: '申报' },
    sideC: null,
    documents: '纳税申报表、完税证明、发票汇总',
    roles: [
      { value: 'sideA', label: '企业账簿' },
      { value: 'sideB', label: '税务申报表' },
      { value: 'auto', label: '自动识别' },
    ],
    hasBalance: true,
    balanceLabels: { sideA: '账簿应纳税额', sideB: '申报应纳税额' },
    reportTitle: '税务对账调节表',
    matchConfig: {
      primaryField: 'amount',
      dateWeight: 0.8,
      amountWeight: 1,
      textWeight: 0.6,
      counterpartyWeight: 0.3,
      exactDateTolerance: 0,
      fuzzyDateTolerance: 5,
      semanticDateTolerance: 30,
      amountTolerance: 0.01,
    },
    aiContext: '税务对账：比对企业账簿记录与税务申报数据，核查税务差异',
  },
  {
    id: 'salary_recon',
    name: '工资对账',
    icon: '👥',
    desc: '工资表 vs 银行代发回单',
    frequency: '月度',
    complexity: '低',
    sideA: { key: 'payroll', label: '工资表', shortLabel: '工资表' },
    sideB: { key: 'bankpay', label: '银行代发回单', shortLabel: '代发' },
    sideC: null,
    documents: '工资表、银行代发明细、个税扣缴表',
    roles: [
      { value: 'sideA', label: '工资表' },
      { value: 'sideB', label: '银行代发回单' },
      { value: 'auto', label: '自动识别' },
    ],
    hasBalance: false,
    balanceLabels: null,
    reportTitle: '工资发放核对报告',
    matchConfig: {
      primaryField: 'amount',
      dateWeight: 0.5,
      amountWeight: 1,
      textWeight: 0.9,
      counterpartyWeight: 1,
      exactDateTolerance: 0,
      fuzzyDateTolerance: 3,
      semanticDateTolerance: 7,
      amountTolerance: 0.01,
    },
    aiContext: '工资对账：比对企业工资表和银行代发回单，核查工资发放差异',
  },
  {
    id: 'asset_recon',
    name: '固定资产对账',
    icon: '🏢',
    desc: '资产台账 vs 实物盘点',
    frequency: '年度',
    complexity: '中',
    sideA: { key: 'ledger', label: '资产台账', shortLabel: '台账' },
    sideB: { key: 'inventory', label: '实物盘点表', shortLabel: '盘点' },
    sideC: null,
    documents: '资产卡片、盘点表、采购发票',
    roles: [
      { value: 'sideA', label: '资产台账' },
      { value: 'sideB', label: '实物盘点表' },
      { value: 'auto', label: '自动识别' },
    ],
    hasBalance: true,
    balanceLabels: { sideA: '账面资产原值合计', sideB: '盘点资产原值合计' },
    reportTitle: '固定资产盘点对账表',
    matchConfig: {
      primaryField: 'amount',
      dateWeight: 0.3,
      amountWeight: 1,
      textWeight: 1,
      counterpartyWeight: 0.8,
      exactDateTolerance: 0,
      fuzzyDateTolerance: 30,
      semanticDateTolerance: 90,
      amountTolerance: 0.05,
    },
    aiContext: '固定资产对账：比对资产台账和实物盘点记录，核查资产盈亏',
  },
];

export const DOC_TYPE_TO_ROLE = {
  bank_recon: { bank_statement: 'sideA', company_ledger: 'sideB' },
  ap_ar_recon: { company_ledger: 'sideA', ap_ar_statement: 'sideB' },
  invoice_verify: { invoice: 'sideA', contract: 'sideB', receipt: 'sideC' },
  expense_recon: { expense: 'sideA', invoice: 'sideB', payment: 'sideC', bank_statement: 'sideC' },
  cash_recon: { cashbook: 'sideA', inventory: 'sideB' },
  tax_recon: { tax_detail: 'sideA', tax: 'sideB' },
  salary_recon: { payroll: 'sideA', bank_statement: 'sideB' },
  asset_recon: { asset_ledger: 'sideA', inventory: 'sideB' },
};

export function detectScenarioFromDocTypes(docTypes) {
  if (!docTypes || docTypes.length === 0) return null;

  const dtSet = new Set(docTypes);
  let bestId = null;
  let bestScore = 0;

  for (const scenario of SCENARIOS) {
    const mapping = DOC_TYPE_TO_ROLE[scenario.id];
    if (!mapping) continue;

    const expectedTypes = Object.keys(mapping);
    let matchedExpected = 0;
    let matchedUploaded = 0;

    for (const et of expectedTypes) {
      if (dtSet.has(et)) matchedExpected++;
    }
    for (const dt of docTypes) {
      if (mapping[dt]) matchedUploaded++;
    }

    if (matchedExpected === 0) continue;

    const coverage = matchedExpected / expectedTypes.length;
    const relevance = matchedUploaded / docTypes.length;
    const score = coverage * 0.6 + relevance * 0.4;

    if (score > bestScore) {
      bestScore = score;
      bestId = scenario.id;
    }
  }

  return bestScore >= 0.3 ? bestId : null;
}

export function getDocTypeLabel(docType) {
  const labels = {
    bank_statement: '银行流水', company_ledger: '企业账簿', invoice: '发票',
    contract: '合同', receipt: '入库单', expense: '报销单', payment: '付款',
    payroll: '工资表', inventory: '盘点', tax: '税务申报', tax_detail: '税务明细',
    asset_ledger: '资产台账', cashbook: '现金日记账', ap_ar_statement: '往来对账单',
  };
  return labels[docType] || docType;
}

export function getScenario(id) {
  return SCENARIOS.find(s => s.id === id) || SCENARIOS[0];
}
