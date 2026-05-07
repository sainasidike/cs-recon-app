export const COMPANY_INFO = {
  name: '河南新程科技有限公司',
  bank: '中国工商银行',
  account: '1702 0236 0920 0156 789',
  branch: '郑州花园路支行',
  period: '2025年1月',
  periodStart: '2025-01-07',
  periodEnd: '2025-01-20',
  openingBalance: 8000,
  closingBalance: 3353.01,
};

// 备用金报销明细（报销单侧）
export const BANK_DATA = [
  { id: 'r1', date: '2025-01-07', desc: '电销部新办电话卡5张', payee: '谭云云', out: 1000, income: null, balance: 7000, ref: '20250109154400012159' },
  { id: 'r2', date: '2025-01-09', desc: '李俊锋充话费', payee: '李俊峰', out: 200, income: null, balance: 6800, ref: '20250109151100052957' },
  { id: 'r3', date: '2025-01-09', desc: '苗倩充话费', payee: '苗倩', out: 200, income: null, balance: 6600, ref: '20250109151300010794' },
  { id: 'r4', date: '2025-01-09', desc: '购买垃圾袋', payee: '孔祥彩', out: 17.90, income: null, balance: 6582.10, ref: '20250113154700045656' },
  { id: 'r5', date: '2025-01-10', desc: 'A4打印纸1箱（5包）', payee: '裴妹好', out: 97.92, income: null, balance: 6484.18, ref: '20250113112200019119' },
  { id: 'r6', date: '2025-01-11', desc: '给客户邮寄合同', payee: '刘青松', out: 18.17, income: null, balance: 6466.01, ref: '20250111092300035981' },
  { id: 'r7', date: '2025-01-11', desc: '任娟娟充话费', payee: '任娟娟', out: 200, income: null, balance: 6266.01, ref: '20250111150500043080' },
  { id: 'r8', date: '2025-01-11', desc: '给客户邮寄合同', payee: '刘青松', out: 22, income: null, balance: 6244.01, ref: '20250111161700027491' },
  { id: 'r9', date: '2025-01-13', desc: '郑州办公室2401水费', payee: '左继豪', out: 138, income: null, balance: 6106.01, ref: '20250113153800020084' },
  { id: 'r10', date: '2025-01-13', desc: '马小营电费1000', payee: '张文', out: 1000, income: null, balance: 5106.01, ref: '20250113185200023851' },
  { id: 'r11', date: '2025-01-16', desc: '购买样品做实验用', payee: '党总', out: 170, income: null, balance: 4936.01, ref: '20250116143800017625' },
  { id: 'r12', date: '2025-01-17', desc: '2201物业费+水费(2025.1.1-3.31)', payee: '裴妹好', out: 699.17, income: null, balance: 4236.84, ref: '20250117154000043351' },
  { id: 'r13', date: '2025-01-17', desc: '1501物业费+水费+垃圾处理费', payee: '裴妹好', out: 656.33, income: null, balance: 3580.51, ref: '20250117153000010175' },
  { id: 'r14', date: '2025-01-17', desc: '苗倩充话费200', payee: '苗倩', out: 200, income: null, balance: 3380.51, ref: '20250117183400003395' },
  { id: 'r15', date: '2025-01-18', desc: '购买5个荣誉证书，颁奖使用', payee: '何云', out: 27.50, income: null, balance: 3353.01, ref: '20250118114200041105' },
];

// 银行回单侧（实际付款记录）
// 设计目标：10笔精确匹配、3笔模糊匹配、2笔银行未达+2笔报销未达
export const LEDGER_DATA = [
  { id: 'p1', date: '2025-01-07', desc: '备用金-电话卡充值', payee: '谭云云', debit: 1000, credit: null, voucher: 'ICBC-0107-001' },
  { id: 'p2', date: '2025-01-09', desc: '报销款-通讯费', payee: '李俊峰', debit: 200, credit: null, voucher: 'ICBC-0109-001' },
  { id: 'p3', date: '2025-01-09', desc: '报销款-通讯费', payee: '苗倩', debit: 200, credit: null, voucher: 'ICBC-0109-002' },
  { id: 'p4', date: '2025-01-10', desc: '备用金-A4纸及打印耗材', payee: '裴妹好', debit: 97.92, credit: null, voucher: 'ICBC-0110-001' },
  { id: 'p5', date: '2025-01-11', desc: '报销款-话费', payee: '任娟娟', debit: 200, credit: null, voucher: 'ICBC-0111-001' },
  { id: 'p6', date: '2025-01-16', desc: '备用金-公用事业费', payee: '左继豪', debit: 138, credit: null, voucher: 'ICBC-0116-001' },
  { id: 'p7', date: '2025-01-17', desc: '备用金-电费', payee: '张文', debit: 1000, credit: null, voucher: 'ICBC-0117-003' },
  { id: 'p8', date: '2025-01-20', desc: '报销款-样品采购费', payee: '党总', debit: 170, credit: null, voucher: 'ICBC-0120-001' },
  { id: 'p9', date: '2025-01-17', desc: '备用金-物业费水费(2201)', payee: '裴妹好', debit: 699.17, credit: null, voucher: 'ICBC-0117-001' },
  { id: 'p10', date: '2025-01-17', desc: '备用金-物业费水费(1501)', payee: '裴妹好', debit: 656.33, credit: null, voucher: 'ICBC-0117-002' },
  { id: 'p11', date: '2025-01-12', desc: '报销款-邮寄费', payee: '刘青松', debit: 18.17, credit: null, voucher: 'ICBC-0112-001' },
  { id: 'p12', date: '2025-01-12', desc: '报销款-邮寄费', payee: '刘青松', debit: 22, credit: null, voucher: 'ICBC-0112-002' },
  { id: 'p13', date: '2025-01-18', desc: '报销款-通讯费', payee: '苗倩', debit: 200, credit: null, voucher: 'ICBC-0118-001' },
  { id: 'p14', date: '2025-01-20', desc: '跨行转账手续费', payee: '中国工商银行', debit: 5, credit: null, voucher: 'ICBC-0120-002' },
  { id: 'p15', date: '2025-01-20', desc: '短信通知服务费（1月）', payee: '中国工商银行', debit: 2, credit: null, voucher: 'ICBC-0120-003' },
];

export const BANK_TOTAL_OUT = BANK_DATA.reduce((s, r) => s + (r.out || 0), 0);
export const BANK_TOTAL_IN = BANK_DATA.reduce((s, r) => s + (r.income || 0), 0);
export const LEDGER_TOTAL_DEBIT = LEDGER_DATA.reduce((s, r) => s + (r.debit || 0), 0);
export const LEDGER_TOTAL_CREDIT = LEDGER_DATA.reduce((s, r) => s + (r.credit || 0), 0);
