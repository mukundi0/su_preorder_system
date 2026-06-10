import axios from "axios"

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import VerifyEmail from "./pages/VerifyEmail"
import AuthContextProvider from "./context/AuthContext"

import { GoogleOAuthProvider } from "@react-oauth/google"

// Set axios defaults
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/"

axios.defaults.baseURL = BASE_URL
axios.defaults.withCredentials = true

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthContextProvider>
        <Router>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/home' element={<Home />} />
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/verify-email' element={<VerifyEmail />} />
          </Routes>
        </Router>
      </AuthContextProvider>
    </GoogleOAuthProvider>
  )
}

export default App
