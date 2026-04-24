import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AnalysisPage from './AnalysisPage.jsx'
import LandingPage from './LandingPage.jsx'
import ProfilePage from './ProfilePage.jsx'
import UploadPage from './UploadPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}
