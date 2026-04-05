<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAdminContext } from '../../context/AdminContext'

const { aToken, backendUrl } = useAdminContext()

const CHAT_URL = import.meta.env.VITE_CHAT_URL ?? 'ws://localhost:4000'
const HTTP_URL = import.meta.env.VITE_CHAT_URL?.replace('ws://', 'http://').replace('wss://', 'https://') ?? 'http://localhost:4000'

const pendingConvs = ref([])
const activeConvId = ref(null)
const messages = ref([])
const inputText = ref('')
const wsRef = ref(null)
const wsStatus = ref('idle')
const pollInterval = ref(null)
const bottomEl = ref(null)

const isConnected = computed(() => wsStatus.value === 'open')

const activeConv = computed(() =>
    pendingConvs.value.find(c => c.id === activeConvId.value) ?? null
)

const fetchPending = async () => {
    if (!aToken.value) return
    try {
        const res = await fetch(`${HTTP_URL}/api/chat/pending`, { headers: { atoken: aToken.value }})
        const data = await res.json()
        if (data.success) pendingConvs.value = data.conversations ?? []
    } catch (e) {
        console.error('[AdminChat] fetchPending error', e)
    }
}

const fetchHistory = async (convId) => {
    try {
        const res = await fetch(`${HTTP_URL}/api/chat/history/${convId}`, { headers: { atoken: aToken.value }})
        const data = await res.json()
        if (data.success && data.conversation) {
            messages.value = data.conversation.messages ?? []
        }
    } catch (e) {
        console.error('[AdminChat] fetchHistory error', e)
    }
}

const closeConversation = async () => {
    if (!activeConvId.value) return
    try {
        await fetch(`${HTTP_URL}/api/chat/close/${activeConvId.value}`, { method: 'PATCH', headers: { atoken: aToken.value }})
        disconnectWS()
        activeConvId.value = null
        messages.value = []
        await fetchPending()
    } catch (e) {
        console.error('[AdminChat] closeConversation error', e)
    }
}

const joinConversation = async (convId) => {
    disconnectWS()
    activeConvId.value = convId
    messages.value = []

    await fetchHistory(convId)

    wsStatus.value = 'connecting'
    const ws = new WebSocket(`${CHAT_URL}/ws/admin/${convId}?atoken=${aToken.value}`)
    wsRef.value = ws

    ws.onopen = () => {
        wsStatus.value = 'open'
    }

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data)
            messages.value.push({
                id: msg.id ?? `${Date.now()}`,
                sender: msg.sender,
                content: msg.content,
                createdAt: msg.createdAt,
            })
            setTimeout(() => {
                bottomEl.value?.scrollIntoView({ behavior: 'smooth' })
            }, 50)
        } catch (e) {
            console.error('[AdminChat] parse error', e)
        }
    }

    ws.onerror = () => { wsStatus.value = 'error' }
    ws.onclose = () => { wsStatus.value = 'idle' }
}

const disconnectWS = () => {
    wsRef.value?.close()
    wsRef.value = null
    wsStatus.value = 'idle'
}

const sendMessage = () => {
    const content = inputText.value.trim()
    if (!content || !isConnected.value) return
    wsRef.value.send(JSON.stringify({ content }))
    inputText.value = ''
}

const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
    }
}

const formatTime = (iso) => {
    if (!iso) return ''
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    catch { return '' }
}

const senderLabel = (sender) => {
    if (sender === 'bot') return 'Bot'
    if (sender === 'admin') return 'You'
    return 'User'
}

onMounted(() => {
    fetchPending()
    pollInterval.value = setInterval(fetchPending, 15_000)
})

onUnmounted(() => {
    clearInterval(pollInterval.value)
    disconnectWS()
})
</script>

<template>
    <div class="flex h-[calc(100vh-64px)] m-5 gap-5 max-w-6xl w-full">

        <div class="w-72 shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <p class="font-semibold text-slate-700 text-sm">Pending Chats</p>
                <button @click="fetchPending" class="text-xs text-indigo-500 hover:underline cursor-pointer">
                    Refresh
                </button>
            </div>

            <div class="flex-1 overflow-y-auto">
                <div v-if="pendingConvs.length === 0" class="text-center text-slate-400 text-sm py-10 px-4">
                    No pending chats
                </div>

                <div v-for="conv in pendingConvs" :key="conv.id" @click="joinConversation(conv.id)" :class="[
                    'px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors',
                    activeConvId === conv.id
                        ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                        : 'hover:bg-slate-50'
                ]">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-lg">User</span>
                        <p class="text-sm font-medium text-slate-700 truncate">{{ conv.userId }}</p>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            waiting
                        </span>
                        <p class="text-[10px] text-slate-400">
                            {{ formatTime(conv.updatedAt) }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div class="px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                <div v-if="activeConvId" class="flex-1 flex items-center gap-3">
                    <span class="text-xl">User</span>
                    <div>
                        <p class="text-sm font-semibold text-slate-700">User {{ activeConvId.slice(-6) }}</p>
                        <div class="flex items-center gap-1.5">
                            <span
                                :class="['w-2 h-2 rounded-full', isConnected ? 'bg-green-400' : 'bg-slate-300 animate-pulse']" />
                            <p class="text-xs text-slate-400">{{ wsStatus }}</p>
                        </div>
                    </div>
                </div>
                <div v-else class="flex-1">
                    <p class="text-sm text-slate-400">Select a conversation to start chatting</p>
                </div>
                <button v-if="activeConvId" @click="closeConversation"
                    class="text-xs px-3 py-1.5 border border-red-300 text-red-500 rounded-full hover:bg-red-50 transition-colors cursor-pointer">
                    Close Chat
                </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50">
                <div v-if="!activeConvId"
                    class="flex items-center justify-center h-full text-slate-400 text-sm text-center">
                    Select a pending chat from the sidebar to get started.
                </div>

                <div v-for="msg in messages" :key="msg.id"
                    :class="['flex gap-2', msg.sender === 'admin' ? 'flex-row-reverse' : 'flex-row']">
                    <div
                        :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0', msg.sender === 'admin' ? 'bg-indigo-100' : 'bg-white border border-slate-200']">
                        {{ msg.sender === 'bot' ? 'Bot' : msg.sender === 'admin' ? 'Admin' : 'User' }}
                    </div>

                    <div :class="['flex flex-col max-w-[75%]', msg.sender === 'admin' ? 'items-end' : 'items-start']">
                        <p class="text-[10px] text-slate-400 mb-0.5 px-1">{{ senderLabel(msg.sender) }}</p>
                        <div
                            :class="['px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap', msg.sender === 'admin' ? 'bg-indigo-500 text-white rounded-tr-sm' : msg.sender === 'bot' ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm' : 'bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-tl-sm']">
                            {{ msg.content }}
                        </div>
                        <span class="text-[10px] text-slate-400 mt-0.5 px-1">{{ formatTime(msg.createdAt) }}</span>
                    </div>
                </div>

                <div ref="bottomEl" />
            </div>

            <div v-if="activeConvId" class="px-4 py-3 border-t border-slate-200 bg-white flex gap-2 items-end">
                <textarea v-model="inputText" @keydown="handleKeyDown" rows="1" placeholder="Reply to user…"
                    :disabled="!isConnected"
                    class="flex-1 resize-none text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 max-h-28"
                    style="line-height: 1.4" />
                <button @click="sendMessage" :disabled="!inputText.trim() || !isConnected"
                    class="w-10 h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>