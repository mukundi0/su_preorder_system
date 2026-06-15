import { useState } from "react"
import axios from "axios"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import sulogo from "../assets/sulogo.png"
import { GoogleLogin } from "@react-oauth/google"

function Login() {
  const { setUser } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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

  // Handle success - Google Auth
  const handleSuccess = async (credentialResponse) => {
    try {
      setError("")
      const { data } = await axios.post('auth/google', {
          credential: credentialResponse.credential
        }
      )

      if (data?.error) {
        setError(data.error)
        return
      }

      // Redirect to home 
      setUser(data)
      navigate("/")
    } catch (error) {
      console.error(error)
      setError(error.response?.data?.error || "Google authentication failed")
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
            <div className="flex items-center mb-1.5">
              <label className="text-xs font-semibold text-gray-600 tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                PASSWORD
              </label>
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

        <GoogleLogin 
          onSuccess={handleSuccess}
          onError={() => setError("Login Failed")}
          text="continue_with"
          hosted_domain="strathmore.edu"
        />

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
