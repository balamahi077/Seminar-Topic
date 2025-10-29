import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { app } from '../utils/firebase'; // Import the firebase app instance
// ... other imports

function LoginPage({ setCurrentPage, setCurrentUser }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    designation: '',
    department: '',
  });

  const auth = getAuth(app); // Get the Auth instance
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const email = formData.email.toLowerCase().trim();
      const password = formData.password; // Get password
      if (isSignUp) {
        // Sign up with Firebase Authentication
        createUserWithEmailAndPassword(auth, email, password)
          .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            updateProfile(user, {
              displayName: formData.name
            }).then(() => {
              setCurrentUser({
                email: user.email,
                name: formData.name
              });
              setCurrentPage('dashboard');
            }).catch((error) => {
              setError(error.message);
            });
          })
          .catch((error) => {
            setError(error.message);
          });

      } else {
        // Sign in with Firebase Authentication
        signInWithEmailAndPassword(auth, email, password)
          .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            setCurrentUser({
              email: user.email,
              name: user.displayName
            });
            setCurrentPage('dashboard');
          })
          .catch((error) => {
            setError(error.message);
          });
      }
        } catch (err) {
      console.error('Error:', err);
      setError('An error occurred. Please try again.');
        }

    setLoading(false);
  };
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
              setIsSignUp(!isSignUp);
              setError('');
              setFormData({
                email: '',
                password: '',
                name: '',
                designation: '',
                department: '',
              });
            }}
            className="text-blue-500 hover:text-blue-600"
          >
            {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

