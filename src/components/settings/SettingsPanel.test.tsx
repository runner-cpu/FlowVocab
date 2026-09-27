import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import SettingsPanel from './SettingsPanel'

beforeEach(async () => {
  await db.delete(); await db.open(); await useProgress.getState().init()
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist: vi.fn().mockResolvedValue(true) } })
})
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await db.delete() })

it('persists accessible volume and voice-rate settings', async () => {
  render(<SettingsPanel onClose={() => undefined} />)
  fireEvent.change(screen.getByLabelText('音效音量'), { target: { value: '.35' } })
  fireEvent.change(screen.getByLabelText('语音速度'), { target: { value: '1.2' } })
  await waitFor(() => expect(useProgress.getState().profile?.settings).toMatchObject({ volume: .35, voiceRate: 1.2 }))
  expect(screen.getByText('35%')).toBeInTheDocument(); expect(screen.getByText('1.2x')).toBeInTheDocument()
})

it('requires a visible second reset confirmation and reports invalid uploads inline', async () => {
  render(<SettingsPanel onClose={() => undefined} />)
  fireEvent.click(screen.getByRole('button', { name: '重置学习数据' }))
  expect(await db.userProfile.get(1)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '确认重置' }))
  await waitFor(() => expect(useProgress.getState().profile?.totalXp).toBe(0))
  const input = screen.getByLabelText('恢复学习数据')
  fireEvent.change(input, { target: { files: [new File(['nope'], 'backup.json', { type: 'application/json' })] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('备份文件无效')
})
