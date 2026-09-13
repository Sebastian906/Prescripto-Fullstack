import { useContext, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AppContext } from "../context/AppContext"
import { sanitizeToken } from '../utils/tokenUtils'
import { toast } from "react-toastify"

const OAuthCallback = () => {
    const { setToken } = useContext(AppContext)
    const navigate = useNavigate()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const raw = params.get('token')
        const token = sanitizeToken(raw ?? '')

        if (!token) {
            toast.error('Invalid login callback')
            navigate('/login', { replace: true })
            return
        } else {
            navigate('/login')
        } 
        localStorage.setItem('token', token)
        setToken(token)
        navigate('/', { replace: true })
    }, [navigate, setToken])

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-slate-500">
                <p>Authenticating...</p>
            </div>
        </div>
    )
}

export default OAuthCallback