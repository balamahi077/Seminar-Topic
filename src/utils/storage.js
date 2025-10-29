// Storage wrapper that uses Firestore when Firebase config is present,
// otherwise falls back to localStorage. This keeps the same async API
// used across the app: get(key), set(key, value), delete(key), list(prefix).
import { initializeApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
let db = null
let firebaseAvailable = false

try {
  // Only attempt to import and init Firebase when env vars are present
  if (import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    // dynamic import to avoid bundling issues when not used
    // eslint-disable-next-line no-undef
    const { initializeApp } = await import('firebase/app')
    const {
      getFirestore,
      doc,
      getDoc,
      setDoc,
      deleteDoc,
      collection,
      getDocs
    } = await import('firebase/firestore')

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    }

    try {
      const app = initializeApp(firebaseConfig)
      db = getFirestore(app)
      firebaseAvailable = true
    } catch (err) {
      console.warn('Firebase initialization failed, falling back to localStorage', err)
      firebaseAvailable = false
    }
  }
} catch (err) {
  // If dynamic import fails, we'll fallback to localStorage
  console.warn('Firebase optional import failed, using localStorage', err)
  firebaseAvailable = false
}

// Helper when Firestore is available
const makeFirestoreStorage = () => {
  // import firestore functions synchronously from global scope is not possible here,
  // so we'll do dynamic imports inside methods to ensure they exist when called.
  return {
    async get(key) {
      const { doc, getDoc } = await import('firebase/firestore')
      const docRef = doc(db, 'kv', key)
      const snap = await getDoc(docRef)
      if (!snap.exists()) throw new Error(`Key "${key}" not found`)
      const data = snap.data()
      return { key, value: data.value }
    },

    async set(key, value) {
      const { doc, setDoc } = await import('firebase/firestore')
      const docRef = doc(db, 'kv', key)
      await setDoc(docRef, { value: value, updatedAt: new Date().toISOString() })
      return { key, value }
    },

    async delete(key) {
      const { doc, deleteDoc } = await import('firebase/firestore')
      const docRef = doc(db, 'kv', key)
      await deleteDoc(docRef)
      return { key, deleted: true }
    },

    async list(prefix) {
      const { collection, getDocs } = await import('firebase/firestore')
      const collRef = collection(db, 'kv')
      const snaps = await getDocs(collRef)
      const keys = []
      snaps.forEach(snap => {
        const id = snap.id
        if (!prefix || id.startsWith(prefix)) keys.push(id)
      })
      return { keys, prefix }
    }
  }
}

const makeLocalStorageWrapper = () => ({
  async get(key) {
    return new Promise((resolve, reject) => {
      const value = localStorage.getItem(key)
      if (value === null) {
        reject(new Error(`Key "${key}" not found`))
      } else {
        resolve({ key, value })
      }
    })
  },

  async set(key, value) {
    return new Promise((resolve) => {
      localStorage.setItem(key, value)
      resolve({ key, value })
    })
  },

  async delete(key) {
    return new Promise((resolve) => {
      localStorage.removeItem(key)
      resolve({ key, deleted: true })
    })
  },

  async list(prefix) {
    return new Promise((resolve) => {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key)
        }
      }
      resolve({ keys, prefix })
    })
  }
})

export const storage = firebaseAvailable ? makeFirestoreStorage() : makeLocalStorageWrapper()

// Note: When running in environments without the Firebase env vars the module
// will immediately export the localStorage wrapper. When Firebase variables are
// provided (locally via Vite env or in Vercel), Firestore will be used instead.