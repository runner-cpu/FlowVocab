import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { db } from '../../../store/db'
import { useProgress } from '../../../store/progressStore'
import type { Word } from '../../../types'
import VocabGame from './VocabGame'
import { useUI } from '../../../store/gameStore'

const words: Word[] = ['explore', 'discover', 'sail', 'return'].map((word, i) => ({ id: word, word, meaning: ['探索', '发现', '航行', '返回'][i], phonetic: '', example: `${word} the island`, exampleCn: '岛屿之旅', level: 0, pos: 'v.', phrases: [{ phrase: `${word} together`, translation: '一起行动' }] }))
beforeEach(async () => {
  await db.delete()
  await db.open()
  await useProgress.getState().init()
  const profile = { ...useProgress.getState().profile!, settings: { zenMode: true, volume: 0, voiceRate: 1 } }
  await db.userProfile.put(profile)
  useProgress.setState({ profile })
  await useProgress.getState().startSession('vocab')
})
afterEach(async () => { cleanup(); await db.delete() })

describe('real vocabulary mission', () => {
  it('loads a forest review word level outside the current track before selecting a question', async () => {
    useUI.setState({ track: 'primary', reviewWordId: 'forest-word', reviewWordLevel: 4 })
    const requested: number[][] = []
    render(<VocabGame loadLevels={async (levels) => { requested.push(levels); return { 0: [], 1: [], 2: [], 3: [], 4: [] } }} />)
    await waitFor(() => expect(requested).toEqual([[0, 4]]))
  })
  it('accepts a digit exactly once, disables answers, then uses Enter to advance', async () => {
    render(<VocabGame words={words} roundSize={2} random={() => 0.999} />)
    await screen.findByRole('heading', { name: 'explore' })
    const choices = within(screen.getByRole('group', { name: '答案选项' })).getAllByRole('button')
    fireEvent.keyDown(window, { key: '1' })
    fireEvent.keyDown(window, { key: '1' })
    fireEvent.click(choices[0])
    await waitFor(() => expect(useProgress.getState().session.total).toBe(1))
    expect(choices.every(button => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByRole('meter', { name: '五连击蓄能' })).toHaveAttribute('aria-valuemax', '5')
    expect((await db.userWords.toArray()).reduce((n, w) => n + w.total, 0)).toBe(1)
    await waitFor(() => expect(screen.getByRole('button', { name: /下一站/ })).toBeEnabled())
    fireEvent.keyDown(window, { key: 'Enter' })
    await screen.findByRole('heading', { name: 'discover' })
    fireEvent.keyDown(window, { key: '2', repeat: true })
    expect(useProgress.getState().session.total).toBe(1)
  })
  it('shows accurate round results and newly unlocked rewards after the configured stop count', async () => {
    render(<VocabGame words={words} roundSize={2} random={() => 0.999} />)
    for (const meaning of ['探索', '发现']) {
      fireEvent.click(await screen.findByRole('button', { name: new RegExp(meaning) }))
      const next = await screen.findByRole('button', { name: /下一站|查看战报/ })
      await waitFor(() => expect(next).toBeEnabled())
      fireEvent.click(next)
    }
    expect(await screen.findByRole('heading', { name: '航程完成' })).toBeVisible()
    expect(screen.getByLabelText('正确率')).toHaveTextContent('100%')
    expect(screen.getByLabelText('本轮最高连击')).toHaveTextContent('2')
    expect(screen.getByLabelText('本轮星级')).toHaveTextContent('3 / 3')
    expect(screen.getByText('初次启航')).toBeVisible()
    expect(screen.getByLabelText('本轮经验')).toHaveTextContent(/(30|40) XP/)
  })
  it('provides a named pronunciation control, an explicit unsupported message, and a single-use hint', async () => {
    render(<VocabGame words={words} random={() => 0.999} />)
    const pronounce = await screen.findByRole('button', { name: '播放单词发音' })
    pronounce.focus()
    expect(pronounce).toHaveFocus()
    fireEvent.click(pronounce)
    expect(screen.getByText(/浏览器暂不支持发音/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /使用提示/ }))
    expect(screen.getByText('explore together')).toBeVisible()
    expect(screen.getByRole('button', { name: /提示已使用/ })).toBeDisabled()
    expect(screen.getByRole('list', { name: '30 站航线' }).children).toHaveLength(30)
  })
  it('converts an inaudible listening stop into an answerable meaning question', async () => {
    const originalSynthesis = Object.getOwnPropertyDescriptor(window, 'speechSynthesis')
    const originalUtterance = Object.getOwnPropertyDescriptor(window, 'SpeechSynthesisUtterance')
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class {} })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, speak() { throw new Error('voice unavailable') } } })
    try {
      render(<VocabGame words={words} roundSize={3} random={() => 0.999} />)
      fireEvent.click(await screen.findByRole('button', { name: new RegExp(words[0].meaning) }))
      const next = await screen.findByRole('button', { name: /下一站/ })
      await waitFor(() => expect(next).toBeEnabled())
      fireEvent.click(next)

      expect(screen.queryByRole('heading', { name: 'discover' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: '播放单词发音' }))

      expect(await screen.findByRole('heading', { name: 'discover' })).toBeVisible()
      expect(screen.getByRole('button', { name: new RegExp(words[1].meaning) })).toBeEnabled()
      expect(useProgress.getState().session.total).toBe(1)
    } finally {
      if (originalSynthesis) Object.defineProperty(window, 'speechSynthesis', originalSynthesis)
      else delete (window as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
      if (originalUtterance) Object.defineProperty(window, 'SpeechSynthesisUtterance', originalUtterance)
      else delete (window as unknown as { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance
    }
  })
  it('does not skip or resubmit a failed save and resumes after the original operation retries', async () => {
    render(<VocabGame words={words} roundSize={1} random={() => 0.999} />)
    const choice = await screen.findByRole('button', { name: /探索/ })
    const fail = () => { throw new Error('disk full') }
    db.progress.hook('updating', fail)
    try {
      fireEvent.click(choice)
      await waitFor(() => expect(useProgress.getState().saveError).toBeTruthy())
      expect(screen.getByRole('button', { name: /查看战报/ })).toBeDisabled()
      fireEvent.keyDown(window, { key: 'Enter' })
      expect(screen.queryByRole('heading', { name: '航程完成' })).toBeNull()
    } finally { db.progress.hook('updating').unsubscribe(fail) }
    await act(async () => { await useProgress.getState().retrySave() })
    await waitFor(() => expect(screen.getByRole('button', { name: /查看战报/ })).toBeEnabled())
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByRole('heading', { name: '航程完成' })).toBeVisible()
    expect((await db.userWords.get('explore'))?.total).toBe(1)
  })
  it('keeps a missed word out of normal selection until its reserved retry stop', async () => {
    render(<VocabGame words={words.slice(0, 3)} roundSize={5} random={() => 0.999} />)
    await screen.findByRole('heading', { name: 'explore' })
    const wrong = within(screen.getByRole('group', { name: '答案选项' })).getAllByRole('button').find(button => !button.textContent?.includes('探索'))!
    fireEvent.click(wrong)
    await waitFor(() => expect(useProgress.getState().session.total).toBe(1))
    fireEvent.click(await screen.findByRole('button', { name: /下一站/ }))
    await screen.findByRole('heading', { name: 'discover' })
    fireEvent.click(screen.getByRole('button', { name: '发现' }))
    await waitFor(() => expect(useProgress.getState().session.total).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: /下一站/ }))
    await screen.findByRole('heading', { name: '航行' })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'sail' } })
    fireEvent.click(screen.getByRole('button', { name: '提交拼写' }))
    await waitFor(() => expect(useProgress.getState().session.total).toBe(3))
    fireEvent.click(screen.getByRole('button', { name: /下一站/ }))
    expect(await screen.findByRole('heading', { name: /discover|sail/ })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'explore' })).toBeNull()
    const duplicate = screen.getByRole('heading').textContent === 'discover' ? '发现' : '航行'
    fireEvent.click(screen.getByRole('button', { name: duplicate }))
    await waitFor(() => expect(useProgress.getState().session.total).toBe(4))
    fireEvent.click(screen.getByRole('button', { name: /下一站/ }))
    await screen.findByRole('heading', { name: 'explore' })
    fireEvent.click(screen.getByRole('button', { name: '探索' }))
    await waitFor(() => expect(useProgress.getState().session.total).toBe(5))
    expect((await db.userWords.get('explore'))?.total).toBe(2)
  })
  it('finishes all 30 stops with spelling, three bosses, continuous combo and a fresh restart', async () => {
    render(<VocabGame words={words} random={() => 0.999} />)
    for (let stop = 1; stop <= 30; stop += 1) {
      await screen.findByText('第 ' + stop + ' / 30 站')
      if (stop % 10 === 0) expect(screen.getByText('BOSS · 第 ' + stop + ' 站首领挑战')).toBeVisible()
      if (stop % 3 === 0) {
        const prompt = screen.getAllByRole('heading').find(heading => words.some(word => word.meaning === heading.textContent))!
        const word = words.find(word => word.meaning === prompt.textContent)!
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  ' + word.word.toUpperCase() + '  ' } })
        // Digits in a spelling field are typing, never a multiple-choice shortcut.
        fireEvent.keyDown(screen.getByRole('textbox'), { key: '1' })
        fireEvent.click(screen.getByRole('button', { name: '提交拼写' }))
      } else {
        const word = words.find(word => screen.queryByRole('heading', { name: word.word }))!
        fireEvent.click(screen.getByRole('button', { name: word.meaning }))
      }
      const next = screen.getByRole('button', { name: /下一站|查看战报/ })
      await waitFor(() => expect(next).toBeEnabled())
      expect(useProgress.getState().combo.combo).toBe(stop)
      fireEvent.click(next)
    }
    expect(await screen.findByRole('heading', { name: '航程完成' })).toBeVisible()
    expect(screen.getByLabelText('本轮最高连击')).toHaveTextContent('30')
    expect(screen.getByText('连击之星')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '再启一段航程' }))
    await screen.findByText('第 1 / 30 站')
    expect((await db.sessions.toArray())[0]).toMatchObject({ total: 30, correct: 30, comboMax: 30 })
    expect(useProgress.getState().session.total).toBe(0)
  })
})
