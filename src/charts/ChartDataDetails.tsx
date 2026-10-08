import type { ReactNode } from 'react'

export function ChartDataDetails({ caption, headers, children }: { caption: string; headers: string[]; children: ReactNode }) {
  return (
    <details className="chart-data">
      <summary>查看{caption}数据</summary>
      <div className="chart-data-scroll">
        <table className="chart-data-table">
          <caption>{caption}</caption>
          <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </details>
  )
}

export function ChartError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="chart-status" role="alert">
      <p>{message}</p>
      <button type="button" className="btn btn-ghost" onClick={onRetry}>重试</button>
    </div>
  )
}
