import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import KidsMode from './pages/KidsMode'
import AppReading from './AppReading'
import { OrdoProvider } from './contexts/OrdoContext'

function App() {
  return (
    <OrdoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="calendario" element={<Calendar />} />
            <Route path="lectura" element={<AppReading />} />
            <Route path="kids" element={<KidsMode />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </OrdoProvider>
  )
}

export default App
