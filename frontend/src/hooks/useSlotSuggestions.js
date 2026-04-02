import { useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export function useSlotSuggestions(backendUrl, token) {
    const [suggestions, setSuggestions] = useState([])
    const [isIdeal, setIsIdeal] = useState(false)
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    const fetchSuggestions = useCallback(async (docId, dateRange, priorityLevel = 'normal') => {
        if (!token || !docId) return
        setLoading(true)
        try {
            const preferredDates = dateRange.map(d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`)
            const { data } = await axios.post(`${backendUrl}/api/scheduling/suggest-slot`, { docId, preferredDates, priorityLevel }, { headers: { token } })
            if (data.suggestions) {
                setSuggestions(data.suggestions)
                setIsIdeal(data.isIdeal)
                setReason(data.reason)
            }
        } catch {
            toast.error('Could not load smart suggestions')
        } finally {
            setLoading(false)
        }
    }, [backendUrl, token])

    return { suggestions, isIdeal, reason, loading, fetchSuggestions }
}