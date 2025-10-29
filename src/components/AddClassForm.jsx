import React, { useState, useRef } from 'react'
import { storage } from '../utils/storage'
import * as XLSX from 'xlsx'

function AddClassForm({ user, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    subject: '',
    section: '',
    assignmentMode: 'individual',
    groupSize: 2
  })
  const [students, setStudents] = useState([{ usn: '', name: '' }])
  const [topics, setTopics] = useState([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const addStudent = () => setStudents([...students, { usn: '', name: '' }])
  const addTopic = () => setTopics([...topics, ''])

  const [isDraggingTopics, setIsDraggingTopics] = useState(false)
  const topicsFileInputRef = useRef(null)

  const handleExcelDrop = async (e, type = 'students') => {
    e.preventDefault()
    if (type === 'students') {
      setIsDragging(false)
    } else {
      setIsDraggingTopics(false)
    }
    
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        setError('The Excel file is empty')
        return
      }

      if (type === 'students') {
        // Check if the Excel has the required columns for students
        const firstRow = jsonData[0]
        if (!firstRow.USN || !firstRow.Name) {
          setError('Excel file must have columns named "USN" and "Name" for students')
          return
        }

        // Map Excel data to students array
        const newStudents = jsonData.map(row => ({
          usn: String(row.USN || '').trim(),
          name: String(row.Name || '').trim()
        })).filter(student => student.usn && student.name)

        if (newStudents.length === 0) {
          setError('No valid student data found in the Excel file')
          return
        }

        setStudents(newStudents)
      } else {
        // Check if the Excel has the required column for topics
        const firstRow = jsonData[0]
        if (!firstRow.Topic) {
          setError('Excel file must have a column named "Topic" for topics')
          return
        }

        // Map Excel data to topics array
        const newTopics = jsonData
          .map(row => String(row.Topic || '').trim())
          .filter(topic => topic)

        if (newTopics.length === 0) {
          setError('No valid topics found in the Excel file')
          return
        }

        setTopics(newTopics)
      }
      setError('')
    } catch (err) {
      console.error('Error reading Excel file:', err)
      setError('Error reading Excel file. Please make sure it\'s a valid Excel file.')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeStudent = (index) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index))
    }
  }

  const removeTopic = (index) => {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const validStudents = students.filter(s => s.usn.trim() && s.name.trim())
      const validTopics = topics.filter(t => t.trim())

      if (validStudents.length === 0) {
        setError('Please add at least one student')
        setLoading(false)
        return
      }

      if (validTopics.length === 0) {
        setError('Please add at least one topic')
        setLoading(false)
        return
      }

      // Create unique class ID
      const classId = `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Prepare class data
      const classData = {
        id: classId,
        lecturerEmail: user.email,
        subject: formData.subject,
        section: formData.section,
        assignmentMode: formData.assignmentMode,
        groupSize: formData.assignmentMode === 'group' ? parseInt(formData.groupSize) : 1,
        topics: validTopics,
        studentCount: validStudents.length,
        createdAt: new Date().toISOString()
      }

      // Save class
      await storage.set(`class:${classId}`, JSON.stringify(classData))

      // Prepare and save students
      const groupSize = formData.assignmentMode === 'group' ? parseInt(formData.groupSize) : 1
      const studentUsns = []

      for (let i = 0; i < validStudents.length; i++) {
        const student = validStudents[i]
        const usn = student.usn.toUpperCase().trim()
        studentUsns.push(usn)

        const groupMembers = formData.assignmentMode === 'group'
          ? validStudents
              .slice(Math.floor(i / groupSize) * groupSize, Math.floor(i / groupSize) * groupSize + groupSize)
              .map(s => s.usn.toUpperCase().trim())
              .filter(u => u !== usn)
          : []

        const studentData = {
          classId: classId,
          usn: usn,
          name: student.name.trim(),
          section: formData.section,
          groupMembers: groupMembers,
          assignedTopic: null,
          createdAt: new Date().toISOString()
        }

        await storage.set(`student:${usn}`, JSON.stringify(studentData))
      }

      // Save list of students for this class
      await storage.set(`class_students:${classId}`, JSON.stringify(studentUsns))

      // Update lecturer's class list
      let lecturerClasses = []
      try {
        const classesResult = await storage.get(`lecturer_classes:${user.email}`)
        if (classesResult?.value) {
          lecturerClasses = JSON.parse(classesResult.value)
        }
      } catch (err) {
        console.log('No existing classes')
      }
      
      lecturerClasses.push(classId)
      await storage.set(`lecturer_classes:${user.email}`, JSON.stringify(lecturerClasses))

      onSuccess()
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to create class. Please try again.')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Add New Class</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-800"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Subject and Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Name
          </label>
          <input
            type="text"
            required
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Data Structures"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section
          </label>
          <input
            type="text"
            required
            value={formData.section}
            onChange={(e) => setFormData({...formData, section: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., A, B, C"
          />
        </div>
      </div>

      {/* Assignment Mode and Group Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assignment Mode
          </label>
          <select
            value={formData.assignmentMode}
            onChange={(e) => setFormData({...formData, assignmentMode: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="individual">Individual</option>
            <option value="group">Group</option>
          </select>
        </div>
        {formData.assignmentMode === 'group' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Size
            </label>
            <input
              type="number"
              min="2"
              value={formData.groupSize}
              onChange={(e) => setFormData({...formData, groupSize: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Students List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-gray-700">Students</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              📄 Import Excel
            </button>
            <button
              type="button"
              onClick={addStudent}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              + Add Student
            </button>
          </div>
        </div>
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".xlsx,.xls"
          onChange={handleExcelDrop}
        />

        {/* Drag and drop zone */}
        <div
          className={`mb-3 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
            ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}
            hover:border-indigo-500 hover:bg-indigo-50 transition-colors`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleExcelDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-gray-600">
            Drag and drop an Excel file here, or click to select
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Excel file should have columns named "USN" and "Name"
          </p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {students.map((student, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder="USN"
                value={student.usn}
                onChange={(e) => {
                  const newStudents = [...students]
                  newStudents[index].usn = e.target.value
                  setStudents(newStudents)
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Name"
                value={student.name}
                onChange={(e) => {
                  const newStudents = [...students]
                  newStudents[index].name = e.target.value
                  setStudents(newStudents)
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              {students.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStudent(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Topics List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-gray-700">Topics</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => topicsFileInputRef.current?.click()}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              📄 Import Excel
            </button>
            <button
              type="button"
              onClick={addTopic}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              + Add Topic
            </button>
          </div>
        </div>

        {/* Hidden file input for topics */}
        <input
          type="file"
          ref={topicsFileInputRef}
          className="hidden"
          accept=".xlsx,.xls"
          onChange={(e) => handleExcelDrop(e, 'topics')}
        />

        {/* Drag and drop zone for topics */}
        <div
          className={`mb-3 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
            ${isDraggingTopics ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}
            hover:border-indigo-500 hover:bg-indigo-50 transition-colors`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDraggingTopics(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDraggingTopics(false)
          }}
          onDrop={(e) => handleExcelDrop(e, 'topics')}
          onClick={() => topicsFileInputRef.current?.click()}
        >
          <p className="text-gray-600">
            Drag and drop an Excel file here, or click to select
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Excel file should have a column named "Topic"
          </p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {topics.map((topic, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder={`Topic ${index + 1}`}
                value={topic}
                onChange={(e) => {
                  const newTopics = [...topics]
                  newTopics[index] = e.target.value
                  setTopics(newTopics)
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              {topics.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTopic(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Class'}
        </button>
      </div>
    </form>
  )
}

export default AddClassForm