import { useId } from 'react'
import { ERROR_TAG_LABELS, ruleExplanation, type ErrorTag } from '../../engine/errorRouting'
import { findContrastCard } from '../../data/contrastCards'
import './ErrorCard.css'

export interface ErrorCardProps {
  tag: ErrorTag
  /** 被作答的目标词，用于查找形近对比卡。 */
  word?: string
  /** 学习者这次的选择。 */
  chosen?: string
  /** 正确答案文本。 */
  correctAnswer?: string
  /** 数据层已有的解释文案（原样补充展示）。 */
  explain?: string
  onDismiss?: () => void
  className?: string
}

/**
 * 错因规则卡 + 形近词对比块。
 *
 * 只读组件：不访问 store、不写进度，任何模块在答错后都能旁路渲染。
 * 视觉全部由 .error-card-* 类和现有 CSS 变量承担，不覆盖全局组件样式。
 */
export default function ErrorCard({ tag, word, chosen, correctAnswer, explain, onDismiss, className }: ErrorCardProps) {
  const baseId = useId()
  const rule = ruleExplanation(tag, { word, chosen, correctAnswer })
  const contrast = [word, chosen, correctAnswer]
    .map((candidate) => (candidate ? findContrastCard(candidate) : null))
    .find((found) => found !== null) ?? null
  const focusKey = (word ?? correctAnswer ?? chosen ?? '').trim().toLowerCase()

  const announcement = [
    `错因判断：${ERROR_TAG_LABELS[tag]}。`,
    `${rule.title}。`,
    rule.cue,
    contrast ? ` 已补充「${contrast.words.map((entry) => entry.word).join(' / ')}」形近词对比。` : ''
  ].join(' ')

  return (
    <section
      className={['error-card', `error-card-tag-${tag}`, className].filter(Boolean).join(' ')}
      aria-labelledby={`${baseId}-title`}
      data-error-tag={tag}
    >
      <p className="error-card-announce" role="status" aria-live="polite">{announcement}</p>
      <div className="error-card-head">
        <h3 className="error-card-title" id={`${baseId}-title`}>{rule.title}</h3>
        <span className="error-card-badge">{ERROR_TAG_LABELS[tag]}</span>
        {onDismiss && (
          <button type="button" className="error-card-dismiss" aria-label="收起错因卡片" onClick={onDismiss}>收起</button>
        )}
      </div>
      <p className="error-card-body">{rule.body}</p>
      <p className="error-card-cue">{rule.cue}</p>

      {(chosen || correctAnswer) && (
        <dl className="error-card-answers">
          {chosen && <><dt>你的选择</dt><dd>{chosen}</dd></>}
          {correctAnswer && <><dt>正确答案</dt><dd>{correctAnswer}</dd></>}
        </dl>
      )}

      {explain && <p className="error-card-explain">{explain}</p>}

      {contrast && (
        <div className="error-card-contrast">
          <h4 className="error-card-contrast-title" id={`${baseId}-contrast-title`}>
            形近词对比：{contrast.words.map((entry) => entry.word).join(' / ')}
          </h4>
          <table className="error-card-contrast-table" aria-describedby={`${baseId}-contrast-tip`}>
            <caption className="error-card-caption">
              {contrast.words.map((entry) => entry.word).join(' 与 ')} 的音标、词性与释义对照
            </caption>
            <thead>
              <tr>
                <th scope="col">单词</th>
                <th scope="col">音标</th>
                <th scope="col">词性</th>
                <th scope="col">释义</th>
              </tr>
            </thead>
            <tbody>
              {contrast.words.map((entry) => {
                const isFocus = focusKey !== '' && entry.word.toLowerCase() === focusKey
                return (
                  <tr key={entry.word} className={isFocus ? 'is-focus' : undefined}>
                    <th scope="row">
                      <span className="error-card-word" lang="en">{entry.word}</span>
                      {isFocus && <span className="error-card-focus">本题词</span>}
                    </th>
                    <td className="error-card-phonetic">{entry.phonetic}</td>
                    <td>{entry.pos}</td>
                    <td>{entry.meaning}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="error-card-tip" id={`${baseId}-contrast-tip`}>区分要点：{contrast.tip}</p>
          <p className="error-card-example"><span lang="en">{contrast.exampleEn}</span><span className="error-card-example-cn">{contrast.exampleCn}</span></p>
        </div>
      )}
    </section>
  )
}
