import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import FeedbackForm from './pages/FeedbackForm'
import AdminDashboard from './pages/AdminDashboard'
import UploadMenu from './pages/UploadMenu'
import AdminEntry from './pages/AdminEntry'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FeedbackForm />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/upload-menu" element={<UploadMenu />} />
        <Route path="/admin-entry" element={<AdminEntry />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
