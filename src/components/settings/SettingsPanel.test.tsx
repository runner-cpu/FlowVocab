import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import SettingsPanel from './SettingsPanel'

beforeEach(async () => {
  await db.delete(); await db.open()
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist: vi.fn().mockResolvedValue(true) } })
  await useProgress.getState().init()
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
  fireEvent.change(screen.getByLabelText('恢复学习数据'), { target: { files: [new File(['nope'], 'backup.json', { type: 'application/json' })] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('备份文件无效')
})

it('rejects oversized backup files before parsing them', async () => {
  render(<SettingsPanel onClose={() => undefined} />)
  const huge = new File(['x'], 'too-large.json', { type: 'application/json' })
  Object.defineProperty(huge, 'size', { configurable: true, value: 10 * 1024 * 1024 + 1 })
  fireEvent.change(screen.getByLabelText('恢复学习数据'), { target: { files: [huge] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('备份文件过大')
})

it('reports reset failures inline instead of leaving an unhandled rejection', async () => {
  const reset = await import('../../store/backup')
  const resetSpy = vi.spyOn(reset, 'resetProgress').mockRejectedValue(new Error('database locked'))
  render(<SettingsPanel onClose={() => undefined} />)
  fireEvent.click(screen.getByRole('button', { name: '重置学习数据' }))
  fireEvent.click(screen.getByRole('button', { name: '确认重置' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('无法重置学习数据')
  resetSpy.mockRestore()
})

it('does not request storage again when the panel remounts or the store re-initializes', async () => {
  const persist = navigator.storage.persist as ReturnType<typeof vi.fn>
  render(<SettingsPanel onClose={() => undefined} />).unmount(); render(<SettingsPanel onClose={() => undefined} />)
  await useProgress.getState().init()
  expect(persist).toHaveBeenCalledTimes(0)
})

it('traps focus, closes on Escape, and restores the settings opener', () => {
  const opener = document.createElement('button'); document.body.append(opener); opener.focus()
  const close = vi.fn(); render(<SettingsPanel onClose={close} opener={opener} />)
  const dialog = screen.getByRole('dialog')
  expect(dialog.contains(document.activeElement)).toBe(true)
  fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(screen.getByRole('button', { name: '重置学习数据' }))
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(opener)
  opener.remove()
})
