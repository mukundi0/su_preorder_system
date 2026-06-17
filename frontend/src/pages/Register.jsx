import { useState } from "react"
import axios from "axios"
import { useNavigate, Link } from "react-router-dom"
import sulogo from "../assets/sulogo.png"
import { useAuth } from "../context/AuthContext"
import { GoogleLogin } from "@react-oauth/google"

function Register() {

  const { setUser } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [studentStaffId, setStudentStaffId] = useState("")
  const [password, setPassword] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState("")
  const [registering, setRegistering] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!agreeTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.")
      return
    }

    if (!email.endsWith("@strathmore.edu")) {
      setError("Please use your institution email.");
      return;
    }

    try {
      setRegistering(true)
      setError("")
      const { data } = await axios.post('auth/register', {
        name, email, password, studentId: studentStaffId,
        role: "student" // Only students can register through the frontend
      })
      if (data.error) {
        return setError(data.error)
      }
      navigate('/login')
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setRegistering(false)
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
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8fe] flex flex-col items-center justify-center px-4 py-8">

      <div className="mb-6">
        <img
          src={sulogo}
          alt="Strathmore University Logo"
          className="h-16 w-auto object-contain mx-auto"
        />
      </div>

      <div className="w-full max-w-[440px] bg-white rounded-xl shadow-sm p-8 animate-fade-in-up">

        {error.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[#00193c]">Create your account</h1>
          <p className="text-sm text-gray-500 mt-2">
            Join the Strathmore Cafeteria community today.
          </p>
        </div>

        <GoogleLogin 
          onSuccess={handleSuccess}
          onError={() => setError("Login Failed")}
          text="continue_with"
          hosted_domain="strathmore.edu"
        />

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Full Name</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">person</span>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00193c] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">University Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">mail</span>
              <input
                type="email"
                placeholder="username@strathmore.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                pattern=".+@strathmore\.edu$"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00193c] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Student/Staff ID</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">badge</span>
              <input
                type="text"
                placeholder="Student or Staff ID"
                value={studentStaffId}
                onChange={(e) => setStudentStaffId(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00193c] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={'\u2022'.repeat(8)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-10 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00193c] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-base">{showPassword ? 'visibility' : 'visibility_off'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="agree-terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#00193c] focus:ring-[#00193c]"
            />
            <label htmlFor="agree-terms" className="text-xs text-gray-500 leading-relaxed">
              I agree to the <a href="/terms" className="text-[#00193c] font-semibold hover:underline">Terms of Service</a> and <a href="/privacy" className="text-[#00193c] font-semibold hover:underline">Privacy Policy</a>.
            </label>
          </div>

          <button
            type="submit"
            disabled={registering}
            className="w-full bg-[#00193c] hover:bg-[#002a5c] text-white font-semibold rounded-lg py-3 text-sm transition-colors disabled:opacity-50"
          >
            {registering ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#b7141c] font-semibold hover:underline">Log in</Link>
        </p>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[11px] text-gray-400">
          Help Center &bull; Cafeteria Policies &bull; Contact Support
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          &copy; 2024 Strathmore University. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Register
