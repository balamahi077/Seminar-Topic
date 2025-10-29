import React, { useState } from 'react'
import { storage } from '../utils/storage'  // ADD THIS

function StudentPage({ setCurrentPage }) {
  const [usn, setUsn] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const checkTopic = async () => {
    if (!usn.trim()) {
      setError('Please enter your USN')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const searchUsn = usn.toUpperCase().trim()
      
      // Get student data - CHANGED
      const studentResult = await storage.get(`student:${searchUsn}`)
      
      if (!studentResult?.value) {
        setError('USN not found. Please check and try again.')
        setLoading(false)
        return
      }

      const studentData = JSON.parse(studentResult.value)

      // If already assigned, gather group members (if any) and show
      if (studentData.assignedTopic) {
        const members = [{ usn: searchUsn, name: studentData.name }]
        if (studentData.groupMembers?.length > 0) {
          for (const memberUsn of studentData.groupMembers) {
            try {
              const memberResult = await storage.get(`student:${memberUsn}`)
              if (memberResult?.value) {
                const memberData = JSON.parse(memberResult.value)
                members.push({ usn: memberUsn, name: memberData.name })
              } else {
                members.push({ usn: memberUsn, name: memberUsn })
              }
            } catch (err) {
              members.push({ usn: memberUsn, name: memberUsn })
            }
          }
        }

        setResult({
          topic: studentData.assignedTopic,
          assignedTo: studentData.assignedBy || studentData.name,
          isGroup: (studentData.groupMembers?.length > 0),
          members
        })
        setLoading(false)
        return
      }

      // Check group members
      if (studentData.groupMembers?.length > 0) {
        for (const memberUsn of studentData.groupMembers) {
          try {
            const memberResult = await storage.get(`student:${memberUsn}`)  // CHANGED
            if (memberResult?.value) {
              const memberData = JSON.parse(memberResult.value)
              if (memberData.assignedTopic) {
                // gather members list including self
                const members = [{ usn: searchUsn, name: studentData.name }]
                for (const mUsn of studentData.groupMembers) {
                  try {
                    const mRes = await storage.get(`student:${mUsn}`)
                    if (mRes?.value) {
                      const mData = JSON.parse(mRes.value)
                      members.push({ usn: mUsn, name: mData.name })
                    } else {
                      members.push({ usn: mUsn, name: mUsn })
                    }
                  } catch (err) {
                    members.push({ usn: mUsn, name: mUsn })
                  }
                }

                setResult({
                  topic: memberData.assignedTopic,
                  assignedTo: memberData.assignedBy || memberData.name,
                  isGroup: true,
                  members
                })
                setLoading(false)
                return
              }
            }
          } catch (err) {
            console.log('Group member not checked:', memberUsn)
          }
        }
      }

      // Get available topics and assign
      const classResult = await storage.get(`class:${studentData.classId}`)  // CHANGED
      if (!classResult?.value) {
        setError('Class information not found.')
        setLoading(false)
        return
      }

      const classData = JSON.parse(classResult.value)
      const topics = classData.topics || []

      // Get assigned topics
      const assignedTopics = new Set()
      try {
        const studentsListResult = await storage.get(`class_students:${studentData.classId}`)  // CHANGED
        
        if (studentsListResult?.value) {
          const studentsList = JSON.parse(studentsListResult.value)
          for (const stUsn of studentsList) {
            try {
              const stResult = await storage.get(`student:${stUsn}`)  // CHANGED
              if (stResult?.value) {
                const stData = JSON.parse(stResult.value)
                if (stData.assignedTopic) {
                  assignedTopics.add(stData.assignedTopic)
                }
              }
            } catch (err) {
              console.log('Error checking student:', stUsn)
            }
          }
        }
      } catch (err) {
        console.log('Error loading class students')
      }

      const availableTopics = topics.filter(t => !assignedTopics.has(t))

      if (availableTopics.length === 0) {
        setError('All topics have been assigned. Please contact your lecturer.')
        setLoading(false)
        return
      }

      // Randomly assign
      const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)]
      
  studentData.assignedTopic = randomTopic
  studentData.assignedBy = studentData.name
  await storage.set(`student:${searchUsn}`, JSON.stringify(studentData))  // CHANGED

      // Update group members and build members list
      const members = [{ usn: searchUsn, name: studentData.name }]
      if (studentData.groupMembers?.length > 0) {
        for (const memberUsn of studentData.groupMembers) {
          try {
            const memberResult = await storage.get(`student:${memberUsn}`)  // CHANGED
            if (memberResult?.value) {
              const memberData = JSON.parse(memberResult.value)
              memberData.assignedTopic = randomTopic
              memberData.assignedBy = studentData.name
              await storage.set(`student:${memberUsn}`, JSON.stringify(memberData))  // CHANGED
              members.push({ usn: memberUsn, name: memberData.name })
            } else {
              members.push({ usn: memberUsn, name: memberUsn })
            }
          } catch (err) {
            console.log('Error updating group member:', memberUsn)
            members.push({ usn: memberUsn, name: memberUsn })
          }
        }
      }

      setResult({
        topic: randomTopic,
        assignedTo: studentData.name,
        isGroup: (studentData.groupMembers?.length > 0),
        members
      })

    } catch (err) {
      console.error('Error:', err)
      setError('USN not found. Please check and try again.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Seminar Topic Checker
          </h1>
          <p className="text-gray-600">
            Enter your USN to check your seminar topic
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter USN
            </label>
            <input
              type="text"
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              placeholder="e.g., 1CR21CS001"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && checkTopic()}
            />
          </div>

          <button
            onClick={checkTopic}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check My Topic'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-2">
                {result.isGroup ? 'Group Topic Assignment' : 'Your Topic Assignment'}
              </h3>
              <div className="bg-white rounded-lg p-4 mb-3">
                <p className="text-gray-800 font-medium">{result.topic}</p>
              </div>
              {result.isGroup && (
                <>
                  <p className="text-sm text-green-800">
                    Topic was picked by: <span className="font-semibold">{result.assignedTo}</span>
                  </p>

                  {result.members && result.members.length > 0 && (
                    <div className="mt-3 bg-white p-3 rounded">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Group Members</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {result.members.map((m) => (
                          <li key={m.usn} className="flex justify-between">
                            <span>{m.name}</span>
                            <span className="text-xs text-gray-500">{m.usn}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <p className="text-xs text-green-700 mt-3">
                This is your final Seminar Topic. 
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setCurrentPage('login')}
            className="w-full text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            Lecturer Login →
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentPage