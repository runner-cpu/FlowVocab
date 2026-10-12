import { useState } from 'react'
import { CalendarClock, ChevronDown, ChevronUp } from 'lucide-react'
import { useUI } from '../../store/gameStore'
import { LEARNING_TRACKS } from '../../types'
import { moduleCoverage, plannedItems, tracksOffering } from '../../data/roadmap'
import './RoadmapNote.css'

/**
 * 内容边界说明：把「本路线还没排进来、但内容库已有」的条目如实列出来。
 *
 * 内容不藏：不开放 ≠ 没做，用户看到的是「后续规划 + 现在去哪条路线能先练」，
 * 而不是一个空荡荡的技能树。数据来自 data/roadmap.ts，可被测试逐条校验。
 */
export default function RoadmapNote({ module }: { module: 'grammar' | 'reading' }) {
  const track = useUI((state) => state.track)
  const [open, setOpen] = useState(false)
  const coverage = moduleCoverage(track, module)
  const planned = plannedItems(track, module)
  if (planned.length === 0) return null

  const grouped = planned.reduce<Record<string, typeof planned>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item]
    return acc
  }, {})
  const moduleLabel = module === 'grammar' ? '语法知识点' : '阅读章节'

  return (
    <section className="roadmap-note" aria-labelledby={`roadmap-${module}-title`}>
      <div className="roadmap-head">
        <span className="roadmap-mark" aria-hidden><CalendarClock size={15} /></span>
        <div>
          <h4 id={`roadmap-${module}-title`}>
            本路线已开放 {coverage.open} / {coverage.total} 个{moduleLabel}
          </h4>
          <p>
            {LEARNING_TRACKS[track].label}路线暂未排入下面 {planned.length} 个{moduleLabel}；
            它们已经完成命题与讲解，会在后续版本随学段路线开放。
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost roadmap-toggle"
          aria-expanded={open}
          aria-controls={`roadmap-${module}-list`}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <>收起规划 <ChevronUp size={14} /></> : <>查看规划 <ChevronDown size={14} /></>}
        </button>
      </div>
      {open && (
        <div className="roadmap-body" id={`roadmap-${module}-list`}>
          {Object.entries(grouped).map(([group, items]) => (
            <div className="roadmap-group" key={group}>
              <strong>{group}</strong>
              <ul>
                {items.map((item) => {
                  const offering = tracksOffering(module, item.id)
                  const elsewhere = offering.filter((candidate) => candidate !== track)
                  return (
                    <li key={item.id}>
                      <span>{item.name}</span>
                      <em>
                        {elsewhere.length > 0
                          ? `现在可切到 ${elsewhere.map((candidate) => LEARNING_TRACKS[candidate].shortLabel).join(' / ')} 路线练习`
                          : '尚未排入任何路线'}
                      </em>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
