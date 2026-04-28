export default function MobileLoading({ scenario }) {
  return (
    <div className="m-loading">
      <div className="m-spinner" />
      <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
        {scenario?.sideC ? '正在执行多维智能匹配...' : '正在执行三轮智能匹配...'}
      </p>
      <p style={{ marginTop: 8, color: 'var(--text-tertiary)', fontSize: 12 }}>
        精确匹配 → 模糊匹配 → 语义匹配
      </p>
    </div>
  );
}
