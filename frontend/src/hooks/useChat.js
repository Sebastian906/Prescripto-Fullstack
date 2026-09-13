import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-toastify'

const CHAT_URL = import.meta.env.VITE_CHAT_URL ?? 'ws://localhost:8080'

export function useChat(token, lang = 'en') {
    const [messages, setMessages] = useState([])
    const [status, setStatus] = useState('idle')
    const [convId, setConvId] = useState(null)
    const wsRef = useRef(null)
    const retryRef = useRef(0)
    const mountedRef = useRef(true)
    const timeoutRef = useRef(null)
    const convIdRef = useRef(null)
    const intentionalCloseRef = useRef(false)

    const appendMessage = useCallback((msg) => {
        setMessages(prev => [...prev, { ...msg, id: msg.id ?? `${Date.now()}-${Math.random()}` }])
    }, [])

    const handleNavigation = useCallback((metadata) => {
        if (!metadata?.action) return
        if (metadata.action === 'navigate' && metadata.route) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('chat:navigate', { detail: { route: metadata.route } }))
            }, 800)
        }
    }, [])

    const connect = useCallback(() => {
        if (!token) return
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        setStatus('connecting')

        // Construcción segura: la base viene de una variable de entorno,
        // los parámetros se codifican individualmente con URLSearchParams.
        const httpBase = CHAT_URL.replace(/^ws/, 'http')
        const base = new URL('/ws/chat', httpBase)
        const params = new URLSearchParams({
            token: String(token),
            lang: /^[a-z]{2}$/.test(lang) ? lang : 'en',
        })
        base.search = params.toString()
        const safeUrl = base.toString().replace(/^http/, 'ws')

        const ws = new WebSocket(safeUrl)
        wsRef.current = ws

        ws.onopen = () => {
            if (!mountedRef.current) return
            setStatus('open')
            retryRef.current = 0
        }

        ws.onmessage = (event) => {
            if (!mountedRef.current) return
            try {
                const msg = JSON.parse(event.data)

                if (!convIdRef.current && msg.conversationId) {
                    convIdRef.current = msg.conversationId
                    setConvId(msg.conversationId)
                }

                appendMessage({
                    id: msg.id,
                    sender: msg.sender,
                    content: msg.content,
                    options: msg.options ?? [],
                    metadata: msg.metadata ?? {},
                    createdAt: msg.createdAt,
                    event: msg.event,
                })

                handleNavigation(msg.metadata)
            } catch (e) {
                console.error('[useChat] parse error', e)
            }
        }

        ws.onerror = () => {
            if (!mountedRef.current) return
            setStatus('error')
        }

        ws.onclose = () => {
            if (!mountedRef.current) return
            if (wsRef.current !== ws) return // callback obsoleto de un socket ya reemplazado
            wsRef.current = null
            if (intentionalCloseRef.current) {
                intentionalCloseRef.current = false
                setStatus('closed')
                return
            }
            setStatus('closed')

            const delay = Math.min(1000 * 2 ** retryRef.current, 30_000)
            retryRef.current += 1
            clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(connect, delay)
        }
    }, [token, lang, appendMessage, handleNavigation])

    useEffect(() => {
        mountedRef.current = true
        intentionalCloseRef.current = false
        if (token) connect()
        return () => {
            mountedRef.current = false
            clearTimeout(timeoutRef.current)
            intentionalCloseRef.current = true
            try { wsRef.current?.close(1000, 'unmount') } catch { /* noop */ }
            wsRef.current = null
        }
    }, [token])

    const send = useCallback((content) => {
        if (!content?.trim()) return

        if (!token) {
            appendMessage({
                sender: 'bot',
                content: 'Please log in to start chatting.',
                options: [],
                metadata: { action: 'navigate', route: '/login', intent: 'auth_required' },
                createdAt: new Date().toISOString(),
            })
            return
        }

        if (wsRef.current?.readyState !== WebSocket.OPEN) {
            connect()
            toast.warn('Reconnecting... message not sent, try again')
            return
        }

        wsRef.current.send(JSON.stringify({ content }))
    }, [token, appendMessage, connect])

    const clearMessages = useCallback(() => setMessages([]), [])

    const sendOption = useCallback((value, label) => {
        // Mostrar el label traducido en el chat del usuario
        appendMessage({
            id: `${Date.now()}-${Math.random()}`,
            sender: 'user',
            content: label,
            options: [],
            metadata: {},
            createdAt: new Date().toISOString(),
        })
        // Enviar el value al backend para procesamiento
        send(value)
    }, [appendMessage, send])

    return {
        messages,
        status,
        convId,
        send,
        sendOption,
        connect,
        clearMessages,
        isConnected: status === 'open',
    }
}