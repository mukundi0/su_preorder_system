import { useState } from "react"
import axios from "axios"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import sulogo from "../assets/sulogo.png"

function Login() {
  const { setUser } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoggingIn(true)
      setError("")
      const { data } = await axios.post('auth/login', {
        email, password
      })
      if (data.error) {
        return setError(data.error)
      }
      setUser(data)
      navigate('/')
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {error.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <div className="text-center mb-8">
        <img 
          src={sulogo}
            alt="Strathmore University Logo" 
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-[#002147]">Strathmore Cafeteria</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
            Welcome back. Enter your university credentials to proceed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <div className="flex items-center mb-1.5">
              <label className="text-xs font-semibold text-gray-600 tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                UNIVERSITY EMAIL OR ID
              </label>
            </div>
            <input
              type="email"
              placeholder="e.g. john.doe@strathmore.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600 tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                PASSWORD
              </label>
              <a href="/forgot-password" className="text-xs text-red-500 hover:underline">
                Forgot Password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400"
            />
            <label htmlFor="remember" className="text-xs text-gray-500">
              Remember this device
            </label>
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loggingIn ? "Signing In..." : "Sign In"}
            {!loggingIn && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">First time here?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link
            to="/register"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#1a2744] text-[#1a2744] rounded-lg text-sm font-semibold hover:bg-[#1a2744] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Sign up using university credentials
          </Link>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-gray-400">
              <Link to="/privacy-policy" className="hover:underline">
                Privacy Policy
              </Link>{" "}
              &bull;{" "}
              <Link to="/terms-of-service" className="hover:underline">
                Terms of Service
              </Link>{" "}
              &bull;{" "}
              <Link to="/help-center" className="hover:underline">
                Help Center
              </Link>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              &copy; 2026 STRATHMORE UNIVERSITY. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
