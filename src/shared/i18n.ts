import {EN} from './en.ts'

// 화면에 보이는 문구의 언어. 한국어 문장을 그대로 키로 쓰고, 영어일 때만 번역표(EN)에서 찾는다.
// 번역표에 없으면 한국어 원문을 그대로 보여주므로 번역이 빠져도 앱이 깨지지 않는다.
export type Lang = 'ko' | 'en'
export type LangSetting = 'auto' | Lang

let lang: Lang = 'ko'

export const setLang = (l: Lang): void => {
    lang = l
}

export const getLang = (): Lang => lang

// 설정이 'auto'면 시스템 언어가 한국어일 때만 한국어, 그 외에는 영어
export const resolveLang = (setting: LangSetting, systemLocale: string): Lang =>
    setting === 'auto' ? (/^ko\b/i.test(systemLocale) ? 'ko' : 'en') : setting

// {이름} 자리를 vars 값으로 바꾼다. 예: tr('{n}일 연속이에요!', {n: 3})
export function tr(ko: string, vars?: Record<string, string | number>): string {
    let s = lang === 'en' ? EN[ko] ?? ko : ko
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
    return s
}
