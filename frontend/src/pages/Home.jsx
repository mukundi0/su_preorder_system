import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import { Link, useNavigate } from "react-router-dom"

function Home() {

    const { user, loading } = useAuth()
    const [error, setError] = useState("")

    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await axios.post('auth/logout')

            navigate('/login')
        } catch (error) {
            console.error(error)
            setError(error.message)
        }
    }

    return (
        <div>
            {
                error.length > 0 && (
                    <p>{error}</p>
                )
            }

            {
                loading && (
                    <p>Loading...</p>
                )
            }

            {
                !user ? (
                    <>
                        <p>Welcome Guest!</p>

                        <Link to='login'>Login</Link>
                    </>
                ) : (
                    <>
                        <p><b>Currently Logged In User:</b></p>
                        <p>Name: { user.name }</p>
                        <p>Email: { user.email }</p>
                        <p>Role: { user.role }</p>

                        <button onClick={handleLogout}>Logout</button>
                    </>
                )
            } 
        </div>
    )
}

export default Home