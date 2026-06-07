import axios from "axios"
import { createContext, useContext, useEffect, useState } from "react"

const AuthContext = createContext()

export default function AuthContextProvider({ children }) {

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [networkError, setNetworkError] = useState(false)

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true)
            setNetworkError(false)
            try {
                const { data } = await axios.get('/auth');

                if (!data?.error) {
                    setUser(data);
                } else {
                    setUser(null)
                }
            } catch (err) {
                console.error("Failed to fetch user:", err);
                setNetworkError(true)
            } finally {
                setLoading(false);
            }
        }

        fetchUser()
    }, [])
    
    return (
        <AuthContext.Provider value={{ user, setUser, loading, networkError }}>
            { children }
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)