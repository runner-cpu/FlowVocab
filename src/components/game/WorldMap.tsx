import type { ChapterView } from '../../engine/chapters'
import { MODULE_META } from '../../types'
import ResponsiveSceneImage from '../ui/ResponsiveSceneImage'
import { LEARNING_SCENES } from '../../data/learningScenes'
import { Lock, Star } from 'lucide-react'
import './WorldMap.css'

function Stars({ count, label }: { count: number; label: string }) {
  return <span className="chapter-stars" role="img" aria-label={label}><span aria-hidden="true">{'★'.repeat(count)}{'☆'.repeat(3 - count)}</span></span>
}

/** 航线地图：把六座灯塔串成一条可解锁的港口航线。 */
export default function WorldMap({ chapters, onEnter }: { chapters: ChapterView[]; onEnter: (chapter: ChapterView) => void }) {
  return <section className="world-map" aria-label="微光港航线地图">
    <svg className="world-map-route" viewBox="0 0 100 420" preserveAspectRatio="none" aria-hidden="true">
      <path d="M50 8 C78 60 22 96 50 148 C78 200 22 236 50 288 C78 340 22 376 50 412" />
    </svg>
    <ol className="world-map-list">
      {chapters.map((chapter) => {
        const scene = LEARNING_SCENES[chapter.sceneIndex]
        const meta = MODULE_META[chapter.module]
        const locked = chapter.status === 'locked'
        // 路线未开放的章节与「前置未完成」是两回事，文案要分开，避免出现“前置章节完成后点亮”这种空指引。
        const description = !chapter.available
          ? '此路线暂未开放'
          : locked
            ? `${chapter.prerequisite ?? '前置章节'}完成后点亮`
            : chapter.subtitle
        const stateLabel = !chapter.available ? '当前路线未开放' : locked ? '未解锁' : `${chapter.stars} 星`
        return <li key={chapter.id} className={`map-node node-${chapter.status} ${chapter.order % 2 === 0 ? 'node-right' : 'node-left'}`}>
          <button type="button" className="map-node-button" disabled={locked || !chapter.available} aria-current={chapter.status === 'current' ? 'step' : undefined} aria-label={`第 ${chapter.order} 站，${chapter.place}，${stateLabel}，${meta.desc}`} onClick={() => onEnter(chapter)}>
            <span className="map-node-visual">
              {chapter.available && scene ? <ResponsiveSceneImage assetStem={scene.visual} sizes="(max-width: 640px) 40vw, 180px" alt="" /> : null}
              <span className="map-node-mark" aria-hidden="true">{locked ? <Lock size={18} /> : <Star size={18} />}</span>
            </span>
            <span className="map-node-copy">
              <small>{String(chapter.order).padStart(2, '0')} · {chapter.place}</small>
              <strong>{chapter.title}</strong>
              <em>{description}</em>
              <Stars count={chapter.stars} label={`${chapter.place}：${chapter.stars} / 3 星`} />
              {chapter.stardust > 0 && <small className="map-node-dust">星尘 +{chapter.stardust}</small>}
            </span>
          </button>
        </li>
      })}
    </ol>
  </section>
}
