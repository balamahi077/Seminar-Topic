import React, { useState, useEffect } from 'react'
import AddClassForm from './AddClassForm'
import ClassDetails from './ClassDetails'
import { storage } from '../utils/storage'  // ADD THIS

// Then replace all window.storage with storage

function Dashboard({ user, onLogout }) {
  const [classes, setClasses] = useState([])
  const [showAddClass, setShowAddClass] = useState(false)
  const [selectedClass, setSelectedClass] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClasses()
  }, [user])

  const loadClasses = async () => {
    try {
      const classesResult = await storage.get(`lecturer_classes:${user.email}`)
      if (classesResult?.value) {
        const classIds = JSON.parse(classesResult.value)
        const classesData = []
        
        for (const classId of classIds) {
          try {
            const classResult = await storage.get(`class:${classId}`)
            if (classResult?.value) {
              classesData.push(JSON.parse(classResult.value))
            }
          } catch (err) {
            console.log('Error loading class:', classId)
          }
        }
        
        setClasses(classesData)
      }
    } catch (err) {
      console.log('No classes found')
      setClasses([])
    }
    setLoading(false)
  }

  const handleDeleteClass = async (classId) => {
    const ok = window.confirm('Are you sure you want to permanently delete this class? This will remove the class and its students.');
    if (!ok) return

    setLoading(true)
    try {
      // Remove class metadata
      try {
        await storage.delete(`class:${classId}`)
      } catch (err) {
        console.log('Failed to delete class metadata', err)
      }

      // Remove class students list and each student record if it belongs to this class
      try {
        const studentsResult = await storage.get(`class_students:${classId}`)
        if (studentsResult?.value) {
          const usns = JSON.parse(studentsResult.value)
          for (const usn of usns) {
            try {
              const sRes = await storage.get(`student:${usn}`)
              if (sRes?.value) {
                const sObj = JSON.parse(sRes.value)
                if (sObj.classId === classId) {
                  await storage.delete(`student:${usn}`)
                }
              }
            } catch (err) {
              // ignore missing student
            }
          }
        }
      } catch (err) {
        console.log('Failed to remove class students list', err)
      }

      try {
        await storage.delete(`class_students:${classId}`)
      } catch (err) {
        // ignore
      }

      // Remove class from lecturer's class list
      try {
        const classesResult = await storage.get(`lecturer_classes:${user.email}`)
        if (classesResult?.value) {
          const classIds = JSON.parse(classesResult.value).filter(id => id !== classId)
          await storage.set(`lecturer_classes:${user.email}`, JSON.stringify(classIds))
        }
      } catch (err) {
        console.log('Failed to update lecturer classes list', err)
      }

      // reload
      await loadClasses()
    } catch (err) {
      console.error('Error deleting class:', err)
    }
    setLoading(false)
  }

  if (selectedClass) {
    return (
      <ClassDetails
        classData={selectedClass}
        onBack={() => {
          setSelectedClass(null)
          loadClasses()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Lecturer Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {user.name}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {showAddClass ? (
            <AddClassForm
              user={user}
              onCancel={() => setShowAddClass(false)}
              onSuccess={() => {
                setShowAddClass(false)
                loadClasses()
              }}
            />
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Your Classes</h2>
                <button
                  onClick={() => setShowAddClass(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  + Add New Class
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Loading classes...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No classes yet. Add your first class to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map(cls => (
                    <div
                      key={cls.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                    >
                      <div className="flex justify-between items-start">
                        <div
                          onClick={() => setSelectedClass(cls)}
                          className="flex-1 cursor-pointer"
                        >
                          <h3 className="font-semibold text-lg text-gray-800 mb-2">
                            {cls.subject}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Section: {cls.section}</p>
                            <p>Mode: {cls.assignmentMode === 'group' 
                              ? `Group (${cls.groupSize} members)` 
                              : 'Individual'}</p>
                            <p>Students: {cls.studentCount || 0}</p>
                            <p>Topics: {cls.topics?.length || 0}</p>
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedClass(cls) }}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id) }}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard