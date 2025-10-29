import React, { useState, useEffect } from 'react'
import { storage } from '../utils/storage'  // ADD THIS

// Replace all window.storage with storage

function ClassDetails({ classData, onBack }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, assigned, unassigned

  useEffect(() => {
    loadStudents()
  }, [classData])

  const loadStudents = async () => {
    try {
      const studentsListResult = await storage.get(`class_students:${classData.id}`)
      if (studentsListResult?.value) {
        const studentUsns = JSON.parse(studentsListResult.value)
        const studentsData = []

        for (const usn of studentUsns) {
          try {
            const studentResult = await storage.get(`student:${usn}`)
            if (studentResult?.value) {
              studentsData.push(JSON.parse(studentResult.value))
            }
          } catch (err) {
            console.log('Error loading student:', usn)
          }
        }

        setStudents(studentsData)
      }
    } catch (err) {
      console.log('Error loading students')
    }
    setLoading(false)
  }

  const handleReassign = async (usn) => {
    if (!window.confirm('Are you sure you want to reset this assignment?')) {
      return
    }

    try {
      const studentResult = await storage.get(`student:${usn}`)
      if (studentResult?.value) {
        const studentData = JSON.parse(studentResult.value)
        studentData.assignedTopic = null
        await storage.set(`student:${usn}`, JSON.stringify(studentData))

        // Reset group members too
        if (studentData.groupMembers?.length > 0) {
          for (const memberUsn of studentData.groupMembers) {
            const memberResult = await storage.get(`student:${memberUsn}`)
            if (memberResult?.value) {
              const memberData = JSON.parse(memberResult.value)
              memberData.assignedTopic = null
              await storage.set(`student:${memberUsn}`, JSON.stringify(memberData))
            }
          }
        }

        loadStudents()
      }
    } catch (err) {
      console.error('Error resetting assignment:', err)
    }
  }

  const exportToCSV = () => {
    const headers = ['USN', 'Name', 'Section', 'Assigned Topic']
    const rows = students.map(s => [
      s.usn,
      s.name,
      s.section,
      s.assignedTopic || 'Not Assigned'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${classData.subject}_${classData.section}_assignments.csv`
    a.click()
  }

  const filteredStudents = students.filter(s => {
    if (filter === 'assigned') return s.assignedTopic
    if (filter === 'unassigned') return !s.assignedTopic
    return true
  })

  const assignedCount = students.filter(s => s.assignedTopic).length
  const unassignedCount = students.length - assignedCount

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <button
            onClick={onBack}
            className="mb-4 text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{classData.subject}</h1>
              <p className="text-gray-600 mt-1">Section: {classData.section}</p>
              <p className="text-sm text-gray-500 mt-1">
                {classData.assignmentMode === 'group' 
                  ? `Group Assignment (${classData.groupSize} members per group)` 
                  : 'Individual Assignment'}
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              📥 Export CSV
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Total Students</p>
              <p className="text-2xl font-bold text-blue-900">{students.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Assigned</p>
              <p className="text-2xl font-bold text-green-900">{assignedCount}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-600">Unassigned</p>
              <p className="text-2xl font-bold text-orange-900">{unassignedCount}</p>
            </div>
          </div>
        </div>

        {/* Topics List */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {classData.topics.map((topic, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 text-sm">
                {index + 1}. {topic}
              </div>
            ))}
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Students</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('assigned')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'assigned' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Assigned
              </button>
              <button
                onClick={() => setFilter('unassigned')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'unassigned' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Unassigned
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">USN</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Topic</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.usn} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{student.usn}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {student.assignedTopic ? (
                          <span className="text-green-700 bg-green-50 px-2 py-1 rounded">
                            {student.assignedTopic}
                          </span>
                        ) : (
                          <span className="text-orange-700 bg-orange-50 px-2 py-1 rounded">
                            Not Assigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {student.assignedTopic && (
                          <button
                            onClick={() => handleReassign(student.usn)}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            Reset
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No students found for this filter.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClassDetails