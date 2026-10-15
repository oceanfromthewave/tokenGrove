import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App'
import {resolveLang, setLang} from '../../shared/i18n'
import './styles.css'

setLang(resolveLang('auto', navigator.language)) // 설정을 읽어 오기 전에도 시스템 언어로 그린다

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App/>
    </StrictMode>
)
