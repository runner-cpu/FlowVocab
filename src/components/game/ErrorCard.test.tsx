import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ErrorCard from './ErrorCard'
import { ERROR_TAG_LABELS, ruleExplanation, ERROR_TAGS, type ErrorTag } from '../../engine/errorRouting'
import { CONTRAST_CARDS } from '../../data/contrastCards'

afterEach(cleanup)

describe('ErrorCard rule layer', () => {
  it.each(ERROR_TAGS.map((tag) => [tag] as const))('renders the rule card for tag %s', (tag: ErrorTag) => {
    const { container } = render(<ErrorCard tag={tag} />)
    const expected = ruleExplanation(tag, {})
    const rule = container.querySelector('.error-card')

    expect(rule).not.toBeNull()
    expect(rule).toHaveAttribute('data-error-tag', tag)
    expect(rule?.className).toContain(`error-card-tag-${tag}`)
    expect(screen.getByRole('heading', { level: 3, name: expected.title })).toBeInTheDocument()
    expect(screen.getByText(expected.body)).toBeInTheDocument()
    expect(rule?.querySelector('.error-card-badge')).toHaveTextContent(ERROR_TAG_LABELS[tag])
  })

  it('is labelled by its own heading so screen readers announce the rule', () => {
    render(<ErrorCard tag="tense" />)
    const rule = screen.getByRole('region')
    const heading = screen.getByRole('heading', { level: 3 })
    expect(rule).toHaveAttribute('aria-labelledby', heading.id)
  })

  it('shows the learner answer pair only when the values are provided', () => {
    const { container } = render(<ErrorCard tag="article" chosen="a" correctAnswer="an" />)
    const answers = container.querySelector('.error-card-answers')
    expect(answers).not.toBeNull()
    expect(within(answers as HTMLElement).getByText('你的选择')).toBeInTheDocument()
    expect(within(answers as HTMLElement).getByText('a')).toBeInTheDocument()
    expect(within(answers as HTMLElement).getByText('正确答案')).toBeInTheDocument()
    expect(within(answers as HTMLElement).getByText('an')).toBeInTheDocument()

    cleanup()
    const { container: bare } = render(<ErrorCard tag="article" />)
    expect(bare.querySelector('.error-card-answers')).toBeNull()
  })

  it('echoes the data-layer explanation when provided', () => {
    render(<ErrorCard tag="agreement" explain="一般现在时第三人称单数用 doesn’t + 动词原形。" />)
    expect(screen.getByText(/一般现在时第三人称单数/)).toBeInTheDocument()
  })
})

describe('ErrorCard announcement and control', () => {
  it('publishes a polite aria-live announcement naming the tag', () => {
    const { container } = render(<ErrorCard tag="preposition" word="in" chosen="on" correctAnswer="at" />)
    const announce = container.querySelector('.error-card-announce')
    expect(announce).not.toBeNull()
    expect(announce).toHaveAttribute('aria-live', 'polite')
    expect(announce).toHaveAttribute('role', 'status')
    expect(announce?.textContent).toContain('错因判断')
    expect(announce?.textContent).toContain(ERROR_TAG_LABELS.preposition)
  })

  it('mentions the contrast card in the announcement only when one is used', () => {
    const { container } = render(<ErrorCard tag="word-choice" word="adapt" />)
    expect(container.querySelector('.error-card-announce')?.textContent).toContain('形近词对比')

    cleanup()
    const { container: plain } = render(<ErrorCard tag="generic" word="zzzznotaword" />)
    expect(plain.querySelector('.error-card-announce')?.textContent).not.toContain('形近词对比')
  })

  it('fires onDismiss from an accessible dismiss button and hides the button when unused', () => {
    const onDismiss = vi.fn()
    render(<ErrorCard tag="spelling" onDismiss={onDismiss} />)
    const button = screen.getByRole('button', { name: '收起错因卡片' })
    fireEvent.click(button)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(button).toHaveTextContent('收起')

    cleanup()
    render(<ErrorCard tag="spelling" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('ErrorCard contrast block', () => {
  it('renders the side-by-side contrast table with phonetics, meanings and the tip', () => {
    const { container } = render(<ErrorCard tag="word-choice" word="affect" chosen="effect" correctAnswer="affect" />)
    const block = container.querySelector('.error-card-contrast')
    const card = CONTRAST_CARDS.find((entry) => entry.id === 'cc-affect-effect')

    expect(block).not.toBeNull()
    expect(card).toBeDefined()
    const table = screen.getByRole('table')
    expect(table).toHaveClass('error-card-contrast-table')
    expect(screen.getByRole('columnheader', { name: '单词' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '音标' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '词性' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '释义' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: /affect/ })).toBeInTheDocument()
    for (const entry of card!.words) {
      expect(within(table).getByText(entry.phonetic)).toBeInTheDocument()
      expect(within(table).getByText(entry.meaning)).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 4, name: /形近词对比/ })).toBeInTheDocument()
    expect(screen.getByText(`区分要点：${card!.tip}`)).toBeInTheDocument()
    expect(screen.getByText(card!.exampleEn, { exact: false })).toBeInTheDocument()
  })

  it('marks the answered word with text, not colour alone', () => {
    const { container } = render(<ErrorCard tag="word-choice" word="dessert" />)
    const focusRow = container.querySelector('tr.is-focus')
    expect(focusRow).not.toBeNull()
    expect(within(focusRow as HTMLElement).getByText('本题词')).toBeInTheDocument()
    expect(within(focusRow as HTMLElement).getByText('dessert')).toBeInTheDocument()
  })

  it('falls back to the chosen or correct answer when no word is passed', () => {
    render(<ErrorCard tag="word-choice" chosen="principal" />)
    expect(screen.getByRole('heading', { level: 4, name: /principal/ })).toBeInTheDocument()
  })

  it('omits the contrast block for tags and words without a curated card', () => {
    const { container } = render(<ErrorCard tag="tense" word="zzzznotaword" />)
    expect(container.querySelector('.error-card-contrast')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()

    cleanup()
    const { container: noWord } = render(<ErrorCard tag="tense" />)
    expect(noWord.querySelector('.error-card-contrast')).toBeNull()
  })

  it('keeps the rule card visible even when a contrast card is present', () => {
    const { container } = render(<ErrorCard tag="word-choice" word="quiet" />)
    expect(container.querySelector('.error-card')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: ruleExplanation('word-choice', {}).title })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument()
  })

  it('supports a custom className without dropping the base classes', () => {
    const { container } = render(<ErrorCard tag="generic" className="custom-slot" />)
    const rule = container.querySelector('.error-card')
    expect(rule).toHaveClass('error-card', 'error-card-tag-generic', 'custom-slot')
  })
})
