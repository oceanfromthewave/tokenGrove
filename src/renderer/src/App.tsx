import GardenView from './views/GardenView'
import PetView from './views/PetView'

// main이 창을 열 때 붙인 해시(#pet / #garden)로 어떤 화면을 그릴지 정한다.
function App(): React.JSX.Element {
    return window.location.hash === '#garden' ? <GardenView/> : <PetView/>
}

export default App
