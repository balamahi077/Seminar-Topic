
import { storage } from '../utils/storage'
import React, { useState } from 'react'

function LoginPage({ setCurrentPage, setCurrentUser }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    designation: '',
    department: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const email = formData.email.toLowerCase().trim()
      
      if (isSignUp) {
        // Check if user exists
        try {
          const existingUser = await storage.get(`lecturer:${email}`)  // CHANGED
          if (existingUser?.value) {
            setError('An account with this email already exists. Please login.')
            setLoading(false)
            return
          }
        } catch (err) {
          // User doesn't exist, continue
        }

        // Create new account
        const lecturerData = {
          email: email,
          name: formData.name,
          designation: formData.designation,
          department: formData.department,
          password: formData.password,
          createdAt: new Date().toISOString()
        }

        await storage.set(`lecturer:${email}`, JSON.stringify(lecturerData))  // CHANGED
        await storage.set('current_user', JSON.stringify({ email, name: formData.name }))  // CHANGED
        
        setCurrentUser({ email, name: formData.name })
        setCurrentPage('dashboard')
      } else {
        // Login
        try {
          const userResult = await storage.get(`lecturer:${email}`)  // CHANGED
          if (!userResult?.value) {
            setError('Invalid email or password.')
            setLoading(false)
            return
          }

          const userData = JSON.parse(userResult.value)
          if (userData.password !== formData.password) {
            setError('Invalid email or password.')
            setLoading(false)
            return
          }

          await storage.set('current_user', JSON.stringify({ email, name: userData.name }))  // CHANGED
          setCurrentUser({ email, name: userData.name })
          setCurrentPage('dashboard')
        } catch (err) {
          setError('Invalid email or password.')
          setLoading(false)
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError('An error occurred. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isSignUp ? 'Create Account' : 'Login'}
        </h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          {isSignUp && (
            <>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Login')}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setFormData({
                email: '',
                password: '',
                name: '',
                designation: '',
                department: ''
              })
            }}
            className="text-blue-500 hover:text-blue-600"
          >
            {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage