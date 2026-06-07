import { useState } from "react"

import axios from "axios"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function Login() {

    const { setUser } = useAuth()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const [error, setError] = useState("")
    const [loggingIn, setLoggingIn] = useState(false)

    const navigate = useNavigate()

    // Handle login form submit
    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            // Set logging in boolean to true
            setLoggingIn(true)

            // Clear error message
            setError("")

            const { data } = await axios.post('auth/login', {
                email, password
            })

            if (data.error) {
                return setError(data.error)
            }

            // Redirect to home page
            setUser(data)
            navigate('/')
        } catch (error) {
            // Show error message
            console.error(error)
            setError(error.message)
        } finally {
            setLoggingIn(false)
        }
    }

    return (
        <div>
            {
                error.length > 0 && (
                    <p>{error}</p>
                )
            }
        
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", width: "400px", margin: "auto" }}>
                <h1>LOGIN</h1>
                <div>
                    <label>Email: </label>
                    <input 
                        type='email' 
                        placeholder='john@gmail.com'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>Password: </label>
                    <input 
                        type='password' 
                        placeholder='*********'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button 
                    type="submit"
                    disabled={loggingIn}
                >
                    {
                        loggingIn ? `Logging In` : `Log In`
                    }
                </button>
            </form>
        </div>
    )
}

export default Login