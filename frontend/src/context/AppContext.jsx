import { createContext, useEffect, useRef, useState } from "react";
import axios from 'axios';
import { toast } from "react-toastify";

export const AppContext = createContext()

// Refresco del badge del buzon. Solo lectura (GET) y solo con la pestana
// visible: no toca la logica de negocio de notificaciones (docs/NOTIFICATIONS.md).
const NOTIFICATIONS_POLL_MS = 30000

const AppcontextProvider = (props) => {

    const currencySymbol = "$"
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [doctors, setDoctors] = useState([])
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : false)
    const [userData, setUserData] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    // Token vigente: descarta respuestas que llegan tras un logout/cambio de
    // usuario (no instala datos de otra sesion).
    const latestToken = useRef(token)
    useEffect(() => {
        latestToken.current = token
    }, [token])

    const getDoctorsData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctors/list')
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error('Error at Loading Doctors')
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message)
        }
    }

    const loadUserProfileData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/users/get-profile', { headers: { token } })
            if (data.success) {
                setUserData(data.userData)
            } else {
                toast.error('Error at Loading User Data')
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message)
        }
    }

    // Buzon in-app (Fase 3): se recarga al iniciar sesion y cada 30s con la
    // pestana visible. Sin push en tiempo real (docs/NOTIFICATIONS.md).
    const loadNotifications = async () => {
        if (!token) {
            setNotifications([])
            setUnreadCount(0)
            return
        }
        try {
            const requestToken = token
        const { data } = await axios.get(backendUrl + '/api/notifications', { headers: { token } })
            if (requestToken !== latestToken.current) return
            if (data.success) {
                setNotifications(data.notifications)
                setUnreadCount(data.unreadCount)
            }
        } catch (error) {
            // Silencioso a proposito: un fallo del buzon no debe llenar de toasts.
            console.log(error)
        }
    }

    // IDs con un PATCH en vuelo: evita requests duplicados por doble clic y
    // que el contador de no leidas baje mas de una vez por la misma transicion.
    const readInFlight = useRef(new Set())

    const markNotificationRead = async (id) => {
        if (readInFlight.current.has(id)) return
        const target = notifications.find((n) => n._id === id)
        if (!target || target.readAt) return
        readInFlight.current.add(id)
        try {
            await axios.patch(backendUrl + `/api/notifications/${id}/read`, {}, { headers: { token } })
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n)),
            )
            setUnreadCount((prev) => Math.max(0, prev - 1))
        } catch (error) {
            console.log(error)
        } finally {
            readInFlight.current.delete(id)
        }
    }

    const value = {
        doctors,
        getDoctorsData,
        currencySymbol,
        token,
        setToken,
        backendUrl,
        userData,
        setUserData,
        loadUserProfileData,
        notifications,
        unreadCount,
        loadNotifications,
        markNotificationRead
    }

    useEffect(() => {
        getDoctorsData()
    }, [])

    useEffect(() => {
        if (token) {
            loadUserProfileData()
        } else {
            setUserData(false)
        }
    }, [token])

    useEffect(() => {
        loadNotifications()
        const intervalId = setInterval(() => {
            // Pausa el polling si la pestana no esta visible.
            if (token && document.visibilityState === 'visible') loadNotifications()
        }, NOTIFICATIONS_POLL_MS)
        return () => clearInterval(intervalId)
    }, [token])

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}

export default AppcontextProvider