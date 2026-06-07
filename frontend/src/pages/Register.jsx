import { useState } from "react"

import axios from "axios"
import { useNavigate } from "react-router-dom"

function Register() {

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const [error, setError] = useState("")
    const [registering, setRegistering] = useState(false)

    const navigate = useNavigate()

    // Handle login form submit
    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            // Set registering boolean to true
            setRegistering(true)

            // Clear error message
            setError("")

            const { data } = await axios.post('auth/register', {
                name, email, password,
                role: "student_staff"
            })

            if (data.error) {
                return setError(data.error)
            }

            // Redirect to login page
            navigate('/login')
        } catch (error) {
            // Show error message
            console.error(error)
            setError(error.message)
        } finally {
            setRegistering(false)
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
                <h1>SIGN UP</h1>
                <div>
                    <label>Name: </label>
                    <input 
                        type='text' 
                        placeholder='John Doe'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

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
                    disabled={registering}
                >
                    {
                        registering ? `Signing Up...` : `Sign Up`
                    }
                </button>
            </form>
        </div>
    )
}

export default Register