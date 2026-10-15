import { Download, ExternalLink, ShieldCheck, Smartphone } from 'lucide-react'
import { APP_ALIAS, APP_NAME, APP_REPOSITORY, APP_URL, APP_VERSION, ATTRIBUTIONS, PRIVACY_NOTES } from '../../data/appInfo'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'

/**
 * 设置面板里的「关于与许可」区。
 *
 * 三件事合在一处，都是评委现场会问的问题：
 * 1. 怎么装到桌面/主屏（安装入口藏在浏览器菜单里，不给步骤就会被漏掉）；
 * 2. 数据去了哪里（无账号、无埋点、音频不上传）；
 * 3. 词库与字体是谁的（许可清单与 THIRD_PARTY_NOTICES.md 同一份口径）。
 *
 * 全部用链接而不是按钮：设置面板的焦点陷阱把「最后一个可聚焦按钮」当作回绕终点，
 * 这一区若插入按钮会改变 Tab 顺序的语义，链接则天然排在按钮之后。
 */
export default function AboutSection() {
  const { state, install, pending } = useInstallPrompt()
  return <section className="settings-about" aria-labelledby="settings-about-title">
    <h3 id="settings-about-title">{APP_NAME}</h3>
    <p className="settings-about-meta">版本 {APP_VERSION} · 本地优先（{APP_ALIAS}）</p>

    <div className="settings-about-block">
      <strong><Smartphone size={15} aria-hidden /> 安装到桌面或主屏</strong>
      {state === 'installed' && <p>已作为独立应用运行，断网也能继续练习。</p>}
      {state === 'available' && <>
        <p>浏览器支持一键安装，安装后会获得独立窗口与桌面图标。</p>
        <button className="settings-install" disabled={pending} onClick={() => void install()}><Download size={16} aria-hidden />{pending ? '正在安装…' : '安装到本机'}</button>
      </>}
      {state === 'manual' && <p>iPhone / iPad 请点 Safari 的「分享」按钮，再选「添加到主屏幕」；其他浏览器可从地址栏右侧的安装图标添加。</p>}
    </div>

    <div className="settings-about-block">
      <strong><ShieldCheck size={15} aria-hidden /> 数据与隐私</strong>
      <ul>{PRIVACY_NOTES.map((note) => <li key={note}>{note}</li>)}</ul>
    </div>

    <div className="settings-about-block">
      <strong>第三方素材许可</strong>
      <ul className="settings-credits">{ATTRIBUTIONS.map((item) => <li key={item.name}><span>{item.name}</span><em>{item.usage}</em><code>{item.license}</code></li>)}</ul>
      <p>完整许可原文随作品包提供（{ATTRIBUTIONS.map((item) => item.archive).join('、')}）。</p>
    </div>

    <p className="settings-about-links"><a href={APP_URL} target="_blank" rel="noreferrer">{APP_URL.replace(/^https?:\/\//, '')} <ExternalLink size={13} aria-hidden /></a><a href={APP_REPOSITORY} target="_blank" rel="noreferrer">源码仓库 <ExternalLink size={13} aria-hidden /></a></p>
  </section>
}
