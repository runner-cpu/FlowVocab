/**
 * 应用身份与第三方素材清单。
 *
 * 设置面板的「关于」区与发布门禁（scripts/release_quality_test.mjs）读同一份数据，
 * 避免界面里写的许可与 THIRD_PARTY_NOTICES.md 各说一套。
 * APP_VERSION 由发布契约断言必须等于 package.json 的 version，防止两处版本号漂移。
 */
export const APP_NAME = '微光港：英语星图'
export const APP_ALIAS = 'FlowVocab'
export const APP_VERSION = '3.0.0'
export const APP_URL = 'https://runner-cpu.github.io/FlowVocab/'
export const APP_REPOSITORY = 'https://github.com/runner-cpu/FlowVocab'

export interface Attribution {
  /** 素材名 */
  name: string
  /** 在作品里的用途 */
  usage: string
  /** 许可证标识 */
  license: string
  /** 仓库内归档位置（离线包同样随包提供） */
  archive: string
}

/**
 * 只列会在作品里出现的内容素材，不列构建期工具。
 * 这里刻意不写词条/例句的具体条数：条数由 scripts/validate-content.mjs 校验，
 * 界面上再抄一遍只会多一个会漂移的数字。
 */
export const ATTRIBUTIONS: Attribution[] = [
  { name: 'ECDICT 开源词典', usage: '五级分片词条、释义与音标', license: 'MIT', archive: 'THIRD_PARTY_NOTICES.md' },
  { name: 'Tatoeba 例句语料', usage: '逐词匹配的英文例句', license: 'CC-BY 2.0 FR', archive: 'public/data/words/examples-attribution.json' },
  { name: 'Outfit 字体', usage: '界面拉丁字符子集（本地打包）', license: 'SIL OFL 1.1', archive: 'public/licenses/outfit-OFL.txt' }
]

export const PRIVACY_NOTES: string[] = [
  '没有账号体系，也没有任何遥测埋点，学习数据只写入本机浏览器的 IndexedDB。',
  '听力跟读用浏览器本地语音识别完成，不录制、不上传音频。',
  '断网后仍可继续练习；已下载的词库分片与页面资源由 Service Worker 缓存。'
]
