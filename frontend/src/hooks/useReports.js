import { useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

/**
 * Hook que consume la tabla DP del backend.
 * El componente no calcula nada — sólo visualiza los acumulados ya tabulados.
 */
export function useReports(backendUrl, token) {
    const [annualReport, setAnnualReport] = useState(null)
    const [trend, setTrend] = useState([])
    const [loading, setLoading] = useState(false)

    const fetchAnnualReport = useCallback(async (year) => {
        if (!token) return
        setLoading(true)
        try {
            // El usuario logueado puede ver sus estadísticas de citas completadas
            // como paciente (endpoint público de usuario si se expone en el futuro)
            // Por ahora este hook queda disponible para cuando el admin
            // quiera mostrar datos en el perfil de un doctor
            const { data } = await axios.get(`${backendUrl}/api/reports/annual`, { params: { year }, headers: { token }})
            if (data.success) setAnnualReport(data)
        } catch {
            toast.error('Could not load report')
        } finally {
            setLoading(false)
        }
    }, [backendUrl, token])

    const fetchTrend = useCallback(async (months = 12) => {
        if (!token) return
        try {
            const { data } = await axios.get(`${backendUrl}/api/reports/trend`, { params: { months }, headers: { token }})
            if (data.success) setTrend(data.trend)
        } catch {
            toast.error('Could not load trend data')
        }
    }, [backendUrl, token])

    return { annualReport, trend, loading, fetchAnnualReport, fetchTrend }
}