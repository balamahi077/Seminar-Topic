import React, { useState, useEffect } from 'react'
import StudentPage from './components/StudentPage'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import { storage } from './utils/storage'  // ADD THIS

function App() {
  const [currentPage, setCurrentPage] = useState('student')
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const result = await storage.get('current_user')  // CHANGED
      if (result?.value) {
        setCurrentUser(JSON.parse(result.value))
        setCurrentPage('dashboard')
      }
    } catch (err) {
      console.log('No active session')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await storage.delete('current_user')  // CHANGED
    setCurrentUser(null)
    setCurrentPage('student')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-indigo-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {currentPage === 'student' && <StudentPage setCurrentPage={setCurrentPage} />}
      {currentPage === 'login' && (
        <LoginPage 
          setCurrentPage={setCurrentPage} 
          setCurrentUser={setCurrentUser} 
        />
      )}
      {currentPage === 'dashboard' && currentUser && (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App