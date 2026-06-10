import { useState, useEffect } from "react"
import { useSearchParams, Link } from "react-router-dom"
import axios from "axios"
import sulogo from "../assets/sulogo.png"

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [state, setState] = useState("loading")
  const [message, setMessage] = useState("")
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState("")

  useEffect(() => {
    if (!token) {
      setState("error")
      setMessage("No verification token found in the URL.")
      return
    }

    const verify = async () => {
      try {
        const { data } = await axios.get(`auth/verify/${encodeURIComponent(token)}`)
        if (data.success) {
          setState("success")
        } else {
          setState("error")
          setMessage(data.error || "Verification failed.")
        }
      } catch (err) {
        setState("error")
        setMessage(err.response?.data?.error || "Verification failed or link expired.")
      }
    }

    verify()
  }, [token])

  const handleResend = async () => {
    if (!email) {
      setResendMsg("Missing email in verification link. Please register or log in to request a new verification email.")
      return
    }

    setResending(true)
    setResendMsg("")
    try {
      const { data } = await axios.post("auth/resend-verification", { email })
      if (data.success) {
        setResendMsg("Verification email resent. Please check your inbox.")
      } else {
        setResendMsg(data.error || "Failed to resend.")
      }
    } catch (err) {
      setResendMsg(err.response?.data?.error || "Network error. Try again later.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8fe] flex flex-col">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-center">
          <img src={sulogo} alt="Strathmore University" className="h-10 w-auto" />
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 sm:p-10 max-w-md w-full text-center">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-[#00193c] text-5xl animate-spin">sync</span>
              <p className="text-gray-500 text-base font-medium">Verifying your email...</p>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#E6F4EA] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#137333] text-4xl">check_circle</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#00193c]">Success!</h1>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                Your email has been successfully verified. You can now access your account and start ordering.
              </p>
              <Link
                to="/home"
                className="mt-2 w-full inline-block bg-[#00193c] text-white font-bold text-sm py-3 px-6 rounded-lg hover:bg-[#002b6a] transition-colors text-center"
              >
                Continue to Dashboard
              </Link>
              <Link to="/login" className="text-sm text-gray-400 hover:text-[#00193c] transition-colors mt-1">
                Back to Login
              </Link>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-4xl">error</span>
              </div>
              <h1 className="text-2xl font-extrabold text-red-600">Verification Failed</h1>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm">{message}</p>

              {resendMsg && (
                <p className={`text-sm leading-relaxed ${resendMsg.includes("resent") ? "text-green-600" : "text-red-600"}`}>
                  {resendMsg}
                </p>
              )}

              <div className="flex flex-col gap-3 w-full mt-2">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full bg-[#00193c] text-white font-bold text-sm py-3 px-6 rounded-lg hover:bg-[#002b6a] transition-colors disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend Verification Email"}
                </button>
                <Link to="/login" className="text-sm text-gray-400 hover:text-[#00193c] transition-colors text-center">
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default VerifyEmail
