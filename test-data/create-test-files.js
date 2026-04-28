import XLSX from 'xlsx';

// Bank statement
const bankHeaders = ['日期', '摘要', '借方金额', '贷方金额', '余额'];
const bankData = [
  ['2026-03-01', '转账-上海XX供应有限公司', 5800, '', 94200],
  ['2026-03-03', 'POS消费-美团收款', '', 12350, 106550],
  ['2026-03-05', '转账-房租3月', 15000, '', 91550],
  ['2026-03-07', '转账-员工工资', 42500, '', 49050],
  ['2026-03-08', 'POS-饿了么结算', '', 8620, 57670],
  ['2026-03-10', '转账-张记食材采购', 3200, '', 54470],
  ['2026-03-12', '银行手续费', 25, '', 54445],
  ['2026-03-15', '转账-XX装修公司', 8000, '', 46445],
  ['2026-03-18', 'POS-抖音外卖结算', '', 15800, 62245],
  ['2026-03-20', '转账-社保缴纳', 6800, '', 55445],
  ['2026-03-22', '转账-水电费', 2300, '', 53145],
  ['2026-03-25', 'POS-大众点评结算', '', 9200, 62345],
  ['2026-03-28', '转账-食材供应商B', 4500, '', 57845],
  ['2026-03-30', '转账收入-客户预付款', '', 2500, 60345],
];

const bankWs = XLSX.utils.aoa_to_sheet([bankHeaders, ...bankData]);
const bankWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(bankWb, bankWs, '银行流水');
XLSX.writeFile(bankWb, 'bank_statement_202603.xlsx');

// Company ledger
const companyHeaders = ['日期', '摘要', '借方金额', '贷方金额'];
const companyData = [
  ['2026-03-01', '食材采购-上海供应商', 5800, ''],
  ['2026-03-03', '堂食+外卖收入', '', 12350],
  ['2026-03-05', '店面租金', 15000, ''],
  ['2026-03-07', '3月工资发放', 42500, ''],
  ['2026-03-09', '外卖平台结算', '', 8620],      // date diff: bank 03-08
  ['2026-03-11', '张记食材货款', 3200, ''],        // date diff: bank 03-10
  ['2026-03-15', '装修尾款', 8000, ''],
  ['2026-03-19', '抖音外卖平台结算', '', 15800],  // date diff: bank 03-18
  ['2026-03-20', '社保缴纳', 6800, ''],
  ['2026-03-22', '现金购买厨具', 1800, ''],        // bank has no record (cash)
  ['2026-03-23', '水电费缴纳', 2300, ''],           // date diff: bank 03-22
  ['2026-03-25', '大众点评收入', '', 9200],
  ['2026-03-29', '食材供应商B采购', 4500, ''],      // date diff: bank 03-28
];

const companyWs = XLSX.utils.aoa_to_sheet([companyHeaders, ...companyData]);
const companyWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(companyWb, companyWs, '企业账簿');
XLSX.writeFile(companyWb, 'company_ledger_202603.xlsx');

console.log('Test files created!');
