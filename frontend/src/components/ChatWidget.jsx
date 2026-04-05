import { useState, useEffect, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { AppContext } from '../context/AppContext'
import botIcon from '../assets/chat_bot_icon.svg'
import userIcon from '../assets/chat_user_icon.svg'
import adminIcon from '../assets/chat_admin_icon.svg'

function formatTime(iso) {
    if (!iso) return ''
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
}
function senderIcon(sender) {
    if (sender === 'bot') return botIcon
    if (sender === 'admin') return adminIcon
    return userIcon
}
function senderLabel(sender) {
    if (sender === 'bot') return 'Bot'
    if (sender === 'admin') return 'Admin'
    return 'You'
}

const ChatWidget = () => {
    const { token } = useContext(AppContext)
    const navigate = useNavigate()
    const { messages, status, send, isConnected } = useChat(token)
    const [open, setOpen] = useState(false)
    const [input, setInput] = useState('')
    const bottomRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
    useEffect(() => {
        const handler = (e) => navigate(e.detail.route)
        window.addEventListener('chat:navigate', handler)
        return () => window.removeEventListener('chat:navigate', handler)
    }, [navigate])
    useEffect(() => { if (open) inputRef.current?.focus() }, [open])

    const handleSend = () => { const t = input.trim(); if (!t) return; send(t); setInput('') }
    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
    const handleOption = (v) => send(v)

    const dotColor = ({ open: 'bg-green-400', connecting: 'bg-yellow-400 animate-pulse', error: 'bg-red-400', closed: 'bg-red-400', idle: 'bg-slate-400' })[status] ?? 'bg-slate-400'

    return (
        <>
            <button onClick={() => setOpen(v => !v)} aria-label="Open chat"
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 transition-transform duration-200 ${open ? 'scale-0 absolute' : 'scale-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 transition-transform duration-200 ${open ? 'scale-100' : 'scale-0 absolute'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {!open && messages.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {messages.length > 9 ? '9+' : messages.length}
                    </span>
                )}
            </button>

            <div className={`fixed bottom-24 right-6 z-50 w-90 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`} style={{ height: '520px' }}>
                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500 text-white shrink-0">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <img src={botIcon} alt="bot" className="w-4 h-4 invert" />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-indigo-500 ${dotColor}`} />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm leading-tight">Prescripto Assistant</p>
                        <p className="text-xs text-indigo-200 capitalize">{status === 'open' ? 'Online' : status}</p>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-indigo-200 hover:text-white transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
                    {messages.length === 0 && !isConnected && (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm text-center px-6">
                            {token ? 'Connecting to chat…' : 'Please log in to start chatting with our assistant.'}
                        </div>
                    )}
                    {messages.map((msg) => {
                        const isUser = msg.sender === 'user'
                        return (
                            <div key={msg.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${isUser ? 'bg-indigo-50 border-indigo-200' : msg.sender === 'admin' ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50 border-indigo-100'}`}>
                                    <img src={senderIcon(msg.sender)} alt={senderLabel(msg.sender)} className="w-4 h-4" />
                                </div>
                                <div className={`flex flex-col gap-1.5 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                                    {!isUser && <span className="text-[10px] text-slate-400 px-1">{senderLabel(msg.sender)}</span>}
                                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-indigo-500 text-white rounded-tr-sm' : msg.sender === 'admin' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-tl-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'}`}>
                                        {msg.content}
                                    </div>
                                    {msg.options?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {msg.options.map((opt) => (
                                                <button key={opt.value} onClick={() => handleOption(opt.value)}
                                                    className="text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full cursor-pointer transition-colors">
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={bottomRef} />
                </div>

                <div className="px-3 py-3 border-t border-slate-200 bg-white flex gap-2 items-end shrink-0">
                    <textarea ref={inputRef} rows={1} value={input}
                        onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder="Type a message…" disabled={!isConnected && !!token}
                        className="flex-1 resize-none text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 max-h-28"
                        style={{ lineHeight: '1.4' }} />
                    <button onClick={handleSend} disabled={!input.trim() || (!isConnected && !!token)}
                        className="w-10 h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
            </div>
        </>
    )
}

export default ChatWidget