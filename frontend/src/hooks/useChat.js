import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-toastify'

const CHAT_URL = import.meta.env.VITE_CHAT_SERVICE_URL ?? import.meta.env.VITE_CHAT_URL ?? 'ws://localhost:4000'

// Backoff contract: 1s x2 ± jitter, max 30s, cap then manual retry.
// Exported pure for node --test without extra deps.
export const MAX_RETRIES = 8
export const BASE_MS = 1000
export const CAP_MS = 30_000
// La conexión solo se considera estable tras 10s abierta; los flaps
// open→drop no deben resetear el presupuesto de reintentos (anti-flap).
export const STABLE_OPEN_MS = 10_000
export function computeDelay(attempt, rand = Math.random) {
    return Math.min(BASE_MS * 2 ** attempt, CAP_MS) * (0.5 + rand() * 0.5)
}

export function useChat(token, lang = 'en') {
    const [messages, setMessages] = useState([])
    const [status, setStatus] = useState('idle')
    const [convId, setConvId] = useState(null)
    const [retryCount, setRetryCount] = useState(0)
    const [needsManualRetry, setNeedsManualRetry] = useState(false)
    const wsRef = useRef(null)
    const retryRef = useRef(0)
    const seenIdsRef = useRef(new Set())
    const mountedRef = useRef(true)
    const timeoutRef = useRef(null)
    const stableRef = useRef(null)
    const convIdRef = useRef(null)
    const intentionalCloseRef = useRef(false)

    // Dedup por _id del server (ObjectID hex). Los broadcasts viejos sin id
    // usan fallback local; con `omitempty` ya no llegan como "".
    const appendMessage = useCallback((msg) => {
        const id = msg.id || `${Date.now()}-${Math.random()}`
        if (seenIdsRef.current.has(id)) return
        seenIdsRef.current.add(id)
        setMessages(prev => {
            if (prev.some(m => m.id === id)) return prev
            return [...prev, { ...msg, id }]
        })
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
        clearTimeout(stableRef.current)

        setStatus('connecting')

        // Construcción segura: la base viene de una variable de entorno,
        // los parámetros se codifican individualmente con URLSearchParams.
        const httpBase = CHAT_URL.replace(/^ws/, 'http')
        const base = new URL('/ws/chat', httpBase)
        const params = new URLSearchParams({
            token: String(token),
            lang: /^[a-z]{2}$/.test(lang) ? lang : 'en',
        })
        // Resume: al reconectar se reusa el conversationId activo; el server lo
        // valida (propiedad + no cerrado) y no reemite welcome en ese caso.
        if (convIdRef.current) params.set('conversationId', convIdRef.current)
        base.search = params.toString()
        const safeUrl = base.toString().replace(/^http/, 'ws')

        const ws = new WebSocket(safeUrl)
        wsRef.current = ws

        ws.onopen = () => {
            if (!mountedRef.current) return
            // Gap-fill siempre que haya conversación: los connects manuales
            // (incl. manualRetry, que resetea el contador) también deben
            // recuperar lo llegado durante la caída.
            const wasResume = !!convIdRef.current
            setStatus('open')
            setNeedsManualRetry(false)
            // Anti-flap: el presupuesto de reintentos solo se resetea tras
            // una conexión estable; los ciclos open→drop siguen contando
            // hacia el cap y terminan en retry manual.
            clearTimeout(stableRef.current)
            stableRef.current = setTimeout(() => {
                if (!mountedRef.current) return
                retryRef.current = 0
                setRetryCount(0)
            }, STABLE_OPEN_MS)
            // Gap-fill: lo llegado mientras estábamos caídos se recupera por
            // historia y se mergea por id (sin pérdida ni duplicado).
            if (wasResume) {
                const httpBase = CHAT_URL.replace(/^ws/, 'http')
                fetch(`${httpBase}/api/chat/history/${convIdRef.current}`, {
                    headers: { token: String(token) },
                })
                    .then(r => r.json())
                    .then(data => {
                        if (!mountedRef.current) return
                        const hist = data.conversation?.messages ?? data.messages ?? []
                        setMessages(prev => {
                            const ids = new Set(prev.map(m => m.id))
                            const merged = [...prev]
                            for (const m of hist) {
                                const hid = m.id ?? m._id
                                if (!hid || ids.has(hid)) continue
                                ids.add(hid)
                                seenIdsRef.current.add(hid)
                                merged.push({
                                    id: hid,
                                    sender: m.sender,
                                    content: m.content,
                                    options: m.options ?? [],
                                    metadata: m.metadata ?? {},
                                    createdAt: m.createdAt,
                                    event: m.event,
                                })
                            }
                            return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                        })
                    })
                    .catch(() => {})
            }
        }

        ws.onmessage = (event) => {
            if (!mountedRef.current) return
            try {
                const msg = JSON.parse(event.data)
                if (import.meta.env.DEV) console.debug('[useChat] rx', { id: msg.id, sender: msg.sender, event: msg.event, conv: msg.conversationId })

                // Evento de sistema no renderizable: sincroniza el id real.
                // Reemplaza siempre que difiera (el server re-sincroniza cuando
                // el fallback elige una conversación distinta a la pedida).
                if (msg.event === 'resumed') {
                    if (msg.conversationId && msg.conversationId !== convIdRef.current) {
                        convIdRef.current = msg.conversationId
                        setConvId(msg.conversationId)
                    }
                    return
                }
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
            clearTimeout(stableRef.current)
            if (intentionalCloseRef.current) {
                intentionalCloseRef.current = false
                setStatus('closed')
                return
            }
            // Cap: tras MAX_RETRIES se para y se pide reintento manual.
            if (retryRef.current >= MAX_RETRIES) {
                setStatus('failed')
                setNeedsManualRetry(true)
                return
            }
            setStatus('closed')

            // Backoff exponencial con jitter: min(30s, 1s * 2^attempt) * (0.5 + rand*0.5)
            const delay = computeDelay(retryRef.current)
            retryRef.current += 1
            setRetryCount(retryRef.current)
            clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(connect, delay)
        }
    }, [token, lang, appendMessage, handleNavigation])

    const manualRetry = useCallback(() => {
        retryRef.current = 0
        setRetryCount(0)
        setNeedsManualRetry(false)
        connect()
    }, [connect])

    useEffect(() => {
        mountedRef.current = true
        intentionalCloseRef.current = false
        if (token) connect()
        return () => {
            mountedRef.current = false
            clearTimeout(timeoutRef.current)
            clearTimeout(stableRef.current)
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
        retryCount,
        needsManualRetry,
        manualRetry,
    }
}