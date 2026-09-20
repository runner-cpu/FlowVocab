interface FlowVocabMarkProps {
  size?: number
  className?: string
  title?: string
}

/** A text-free mark: an open book, a flowing learning path and a north-star spark. */
export default function FlowVocabMark({ size = 38, className = '', title = 'FlowVocab' }: FlowVocabMarkProps) {
  return (
    <svg className={`flowvocab-mark ${className}`} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title}>
      <defs>
        <linearGradient id="flowvocab-mark-gradient" x1="8" y1="38" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="#4c8dff" />
        </linearGradient>
      </defs>
      <path d="M8.5 13.8c4.8-2.4 9.8-1.8 15.5 2.8v22.1c-5.7-4.2-10.7-4.9-15.5-2.6V13.8Z" fill="url(#flowvocab-mark-gradient)" opacity=".94" />
      <path d="M39.5 13.8c-4.8-2.4-9.8-1.8-15.5 2.8v22.1c5.7-4.2 10.7-4.9 15.5-2.6V13.8Z" fill="url(#flowvocab-mark-gradient)" opacity=".62" />
      <path d="M24 16.6v22.1" stroke="white" strokeOpacity=".82" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12.8 29.2c4.1-1.2 7.8-.4 11.2 2.2 3.5-2.7 7.2-3.4 11.2-2.2" fill="none" stroke="white" strokeOpacity=".74" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34.7 6.3 36 10l3.7 1.3-3.7 1.3-1.3 3.7-1.3-3.7-3.7-1.3 3.7-1.3 1.3-3.7Z" fill="#f2a65a" />
      <circle cx="10.3" cy="10.5" r="2" fill="#f2a65a" opacity=".9" />
    </svg>
  )
}
