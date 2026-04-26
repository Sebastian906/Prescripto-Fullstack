import { useContext, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AppContext } from "../context/AppContext"
import { sanitizeToken } from '../utils/tokenUtils'

const OAuthCallback = () => {
    const { setToken } = useContext(AppContext)
    const navigate = useNavigate()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const raw = params.get('token')
        const token = sanitizeToken(raw ?? '')

        if (token) {
            localStorage.setItem('token', token)
            setToken(token)
            navigate('/')
        } else {
            navigate('/login')
        }
    }, [])

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-slate-500">
                <p>Authenticating...</p>
            </div>
        </div>
    )
}

export default OAuthCallback