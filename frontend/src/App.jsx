import axios from "axios"

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import AuthContextProvider from "./context/AuthContext"

// Set axios defaults
const BASE_URL = "http://localhost:8000/api/"

axios.defaults.baseURL = BASE_URL
axios.defaults.withCredentials = true

function App() {
  return (
    <AuthContextProvider>
      <Router>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
        </Routes>
      </Router>
    </AuthContextProvider>
  )
}

export default App
