export const COMPANY_INFO = {
  name: '杭州锦鲤餐饮管理有限公司',
  bank: '中国工商银行',
  account: '1202 0236 0920 0156 789',
  branch: '杭州西湖支行',
  period: '2026年4月',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  openingBalance: 253500,
  closingBalance: 236765,
};

export const BANK_DATA = [
  { id: 'b1', date: '2026-04-01', desc: '转账汇款-租金', payee: '杭州西湖物业发展有限公司', out: 35000, income: null, balance: 218500, ref: 'ICBC20260401001' },
  { id: 'b2', date: '2026-04-02', desc: 'POS消费入账', payee: '美团收付通', out: null, income: 47800, balance: 266300, ref: 'ICBC20260402002' },
  { id: 'b3', date: '2026-04-03', desc: '转账汇款-食材采购', payee: '永辉超市股份有限公司', out: 18500, income: null, balance: 247800, ref: 'ICBC20260403003' },
  { id: 'b4', date: '2026-04-04', desc: '代发工资', payee: '批量代发(28人)', out: 89000, income: null, balance: 158800, ref: 'ICBC20260404004' },
  { id: 'b5', date: '2026-04-05', desc: 'POS消费入账', payee: '饿了么结算中心', out: null, income: 32600, balance: 191400, ref: 'ICBC20260405005' },
  { id: 'b6', date: '2026-04-07', desc: '转账汇款-燃气费', payee: '杭州燃气集团有限公司', out: 4200, income: null, balance: 187200, ref: 'ICBC20260407006' },
  { id: 'b7', date: '2026-04-08', desc: '社保代扣', payee: '杭州市社保代扣中心', out: 26800, income: null, balance: 160400, ref: 'ICBC20260408007' },
  { id: 'b8', date: '2026-04-10', desc: 'POS消费入账', payee: '抖音电商结算', out: null, income: 21500, balance: 181900, ref: 'ICBC20260410008' },
  { id: 'b9', date: '2026-04-11', desc: '转账汇款-维修费', payee: '杭州厨业设备维修服务部', out: 3600, income: null, balance: 178300, ref: 'ICBC20260411009' },
  { id: 'b10', date: '2026-04-12', desc: '账户管理费', payee: '中国工商银行', out: 35, income: null, balance: 178265, ref: 'ICBC20260412010' },
  { id: 'b11', date: '2026-04-14', desc: 'POS消费入账', payee: '大众点评商户结算', out: null, income: 15200, balance: 193465, ref: 'ICBC20260414011' },
  { id: 'b12', date: '2026-04-15', desc: '转账汇款-调味品采购', payee: '海天味业佛山分公司', out: 6800, income: null, balance: 186665, ref: 'ICBC20260415012' },
  { id: 'b13', date: '2026-04-17', desc: '转账汇款-水电费', payee: '国网浙江省电力有限公司', out: 7500, income: null, balance: 179165, ref: 'ICBC20260417013' },
  { id: 'b14', date: '2026-04-18', desc: 'POS消费入账', payee: '银联商务清算', out: null, income: 28900, balance: 208065, ref: 'ICBC20260418014' },
  { id: 'b15', date: '2026-04-20', desc: '转账汇款-包装材料', payee: '义乌市恒达包装材料有限公司', out: 4500, income: null, balance: 203565, ref: 'ICBC20260420015' },
  { id: 'b16', date: '2026-04-22', desc: 'POS消费入账', payee: '美团收付通', out: null, income: 38600, balance: 242165, ref: 'ICBC20260422016' },
  { id: 'b17', date: '2026-04-24', desc: '转账汇款-食材', payee: '杭州菜鲜生农产品配送有限公司', out: 22000, income: null, balance: 220165, ref: 'ICBC20260424017' },
  { id: 'b18', date: '2026-04-25', desc: '贷款还款', payee: '中国工商银行(内部)', out: 8000, income: null, balance: 212165, ref: 'ICBC20260425018' },
  { id: 'b19', date: '2026-04-28', desc: 'POS消费入账', payee: '饿了么结算中心', out: null, income: 25800, balance: 237965, ref: 'ICBC20260428019' },
  { id: 'b20', date: '2026-04-30', desc: '转账汇款-检测费', payee: '杭州市食品药品检验研究院', out: 1200, income: null, balance: 236765, ref: 'ICBC20260430020' },
];

export const LEDGER_DATA = [
  { id: 'l1', date: '2026-04-01', desc: '场地租金-中央厨房4月', payee: '杭州西湖物业', debit: 35000, credit: null, voucher: 'PZ-2026-04-001' },
  { id: 'l2', date: '2026-04-02', desc: '外卖平台收入-美团3月下半月结算', payee: '美团', debit: null, credit: 47800, voucher: 'PZ-2026-04-002' },
  { id: 'l3', date: '2026-04-03', desc: '食材采购-永辉第一批', payee: '永辉超市', debit: 18500, credit: null, voucher: 'PZ-2026-04-003' },
  { id: 'l4', date: '2026-04-04', desc: '3月员工工资(厨师/服务/管理28人)', payee: '员工', debit: 89000, credit: null, voucher: 'PZ-2026-04-004' },
  { id: 'l5', date: '2026-04-06', desc: '外卖平台收入-饿了么3月下半月', payee: '饿了么', debit: null, credit: 32600, voucher: 'PZ-2026-04-005' },
  { id: 'l6', date: '2026-04-07', desc: '3月天然气费用', payee: '杭州燃气集团', debit: 4200, credit: null, voucher: 'PZ-2026-04-006' },
  { id: 'l7', date: '2026-04-08', desc: '4月社保+公积金(28人)', payee: '社保中心', debit: 26800, credit: null, voucher: 'PZ-2026-04-007' },
  { id: 'l8', date: '2026-04-11', desc: '抖音团购3月核销结算', payee: '抖音电商', debit: null, credit: 21500, voucher: 'PZ-2026-04-008' },
  { id: 'l9', date: '2026-04-11', desc: '排烟系统+冷库维修', payee: '杭州厨业设备', debit: 3600, credit: null, voucher: 'PZ-2026-04-009' },
  { id: 'l10', date: '2026-04-14', desc: '大众点评4月上旬结算', payee: '大众点评', debit: null, credit: 15200, voucher: 'PZ-2026-04-010' },
  { id: 'l11', date: '2026-04-15', desc: '调味品采购-海天酱油/蚝油/料酒', payee: '海天味业', debit: 6800, credit: null, voucher: 'PZ-2026-04-011' },
  { id: 'l12', date: '2026-04-17', desc: '3月水费+电费', payee: '国网浙江电力', debit: 7500, credit: null, voucher: 'PZ-2026-04-012' },
  { id: 'l13', date: '2026-04-19', desc: '堂食POS汇总4.11-4.17', payee: '银联商务', debit: null, credit: 28900, voucher: 'PZ-2026-04-013' },
  { id: 'l14', date: '2026-04-20', desc: '外卖包装材料-餐盒+纸袋+餐具', payee: '义乌恒达包装', debit: 4500, credit: null, voucher: 'PZ-2026-04-014' },
  { id: 'l15', date: '2026-04-22', desc: '外卖平台收入-美团4月上半月', payee: '美团', debit: null, credit: 38600, voucher: 'PZ-2026-04-015' },
  { id: 'l16', date: '2026-04-24', desc: '蔬菜+肉类4月第二批', payee: '菜鲜生农产品', debit: 22000, credit: null, voucher: 'PZ-2026-04-016' },
  { id: 'l17', date: '2026-04-25', desc: '店面装修贷款月供(本金+利息)', payee: '工商银行', debit: 8000, credit: null, voucher: 'PZ-2026-04-017' },
  { id: 'l18', date: '2026-04-29', desc: '饿了么4月上半月结算', payee: '饿了么', debit: null, credit: 25800, voucher: 'PZ-2026-04-018' },
  { id: 'l19', date: '2026-04-30', desc: '食品安全抽检费', payee: '食品药品检验院', debit: 1200, credit: null, voucher: 'PZ-2026-04-019' },
  { id: 'l20', date: '2026-04-30', desc: '厨师服装定制', payee: '杭州制衣厂', debit: 2800, credit: null, voucher: 'PZ-2026-04-020' },
];

export const BANK_TOTAL_OUT = BANK_DATA.reduce((s, r) => s + (r.out || 0), 0);
export const BANK_TOTAL_IN = BANK_DATA.reduce((s, r) => s + (r.income || 0), 0);
export const LEDGER_TOTAL_DEBIT = LEDGER_DATA.reduce((s, r) => s + (r.debit || 0), 0);
export const LEDGER_TOTAL_CREDIT = LEDGER_DATA.reduce((s, r) => s + (r.credit || 0), 0);
