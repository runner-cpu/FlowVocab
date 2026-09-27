import { useEffect, useRef, useState } from 'react'
import { Download, RotateCcw, Upload, X } from 'lucide-react'
import { useProgress } from '../../store/progressStore'
import { exportProgressBackup, importProgressBackup, resetProgress } from '../../store/backup'

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const profile = useProgress((state) => state.profile)
  const updateSettings = useProgress((state) => state.updateSettings)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [durable, setDurable] = useState<boolean | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const persist = navigator.storage?.persist
    if (persist) void persist.call(navigator.storage).then(setDurable).catch(() => setDurable(false))
  }, [])
  if (!profile) return null
  const settings = profile.settings
  const download = async () => {
    const blob = new Blob([JSON.stringify(await exportProgressBackup(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = 'flowvocab-backup.json'; link.click(); URL.revokeObjectURL(url)
    setMessage('学习数据已导出到本设备')
  }
  const restore = async (input: HTMLInputElement) => {
    const selected = input.files?.[0]
    if (!selected) return
    try { await importProgressBackup(JSON.parse(await selected.text())); await useProgress.getState().init(); setMessage('学习数据已恢复') }
    catch { setMessage('备份文件无效，未更改学习数据') }
    finally { input.value = '' }
  }
  return <div className="settings-backdrop" role="presentation">
    <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><div><p>本地优先</p><h2 id="settings-title">学习设置</h2></div><button className="settings-close" onClick={onClose} aria-label="关闭设置"><X size={18} /></button></header>
      <div className="settings-range"><label htmlFor="settings-volume">音效音量</label> <output>{Math.round(settings.volume * 100)}%</output><input id="settings-volume" type="range" min="0" max="1" step=".05" value={settings.volume} onChange={(event) => void updateSettings({ volume: Number(event.target.value) })} /></div>
      <div className="settings-range"><label htmlFor="settings-rate">语音速度</label> <output>{settings.voiceRate.toFixed(1)}x</output><input id="settings-rate" type="range" min=".6" max="1.4" step=".1" value={settings.voiceRate} onChange={(event) => void updateSettings({ voiceRate: Number(event.target.value) })} /></div>
      <label className="settings-check"><input type="checkbox" checked={settings.zenMode} onChange={(event) => void updateSettings({ zenMode: event.target.checked })} /> 安静模式（关闭音效）</label>
      <p className="settings-status" role="status">{durable === null ? '正在确认离线存储…' : durable ? '已请求持久离线存储' : '浏览器未授予持久离线存储'}</p>
      {message && <p role="alert" className="settings-message">{message}</p>}
      <div className="settings-actions"><button onClick={() => void download()}><Download size={16} />导出学习数据</button><button onClick={() => file.current?.click()}><Upload size={16} />恢复学习数据</button><input ref={file} aria-label="恢复学习数据" type="file" accept="application/json" hidden onChange={(event) => void restore(event.currentTarget)} /></div>
      <div className="settings-danger">{resetting ? <><p>此操作会清除本设备的学习进度，词库会保留。</p><button className="danger" onClick={() => void resetProgress().then(() => { setResetting(false); setMessage('学习进度已重置') })}>确认重置</button><button onClick={() => setResetting(false)}>取消</button></> : <button className="danger" onClick={() => setResetting(true)}><RotateCcw size={16} />重置学习数据</button>}</div>
    </section>
  </div>
}
