<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useAdminContext } from '../../context/AdminContext'

const { aToken, backendUrl } = useAdminContext()

const CHAT_URL = import.meta.env.VITE_CHAT_URL ?? 'ws://localhost:4000'
const HTTP_URL = (import.meta.env.VITE_CHAT_URL ?? 'ws://localhost:4000')
    .replace('ws://', 'http://')
    .replace('wss://', 'https://')

const pendingConvs = ref([])
const activeConvId = ref(null)
const messages = ref([])
const inputText = ref('')
const wsRef = ref(null)
const wsStatus = ref('idle')
const pollInterval = ref(null)
const bottomEl = ref(null)
const seenMessageIds = ref(new Set())

const isConnected = computed(() => wsStatus.value === 'open')

const activeConv = computed(() =>
    pendingConvs.value.find(c => c.id === activeConvId.value) ?? null
)

const scrollToBottom = () => {
    nextTick(() => {
        bottomEl.value?.scrollIntoView({ behavior: 'smooth' })
    })
}

const fetchPending = async () => {
    if (!aToken.value) return
    try {
        const res = await fetch(`${HTTP_URL}/api/chat/pending`, {
            headers: { atoken: aToken.value },
        })
        const data = await res.json()
        if (data.success) pendingConvs.value = data.conversations ?? []
    } catch (e) {
        console.error('[AdminChat] fetchPending', e)
    }
}

const fetchHistory = async (convId) => {
    try {
        const res = await fetch(`${HTTP_URL}/api/chat/history/${convId}`, {
            headers: { atoken: aToken.value },
        })
        const data = await res.json()
        if (data.success && data.conversation) {
            const hist = data.conversation.messages ?? []

            seenMessageIds.value = new Set(
                hist.map(m => m.id).filter(Boolean)
            )

            messages.value = hist
            scrollToBottom()
        }
    } catch (e) {
        console.error('[AdminChat] fetchHistory', e)
    }
}

const closeConversation = async () => {
    if (!activeConvId.value) return
    try {
        await fetch(`${HTTP_URL}/api/chat/close/${activeConvId.value}`, {
            method: 'PATCH',
            headers: { atoken: aToken.value },
        })
    } catch (e) {
        console.error('[AdminChat] closeConversation', e)
    }
    disconnectWS()
    activeConvId.value = null
    messages.value = []
    seenMessageIds.value = new Set()
    await fetchPending()
}

const joinConversation = async (convId) => {
    disconnectWS()
    activeConvId.value = convId
    messages.value = []
    seenMessageIds.value = new Set()

    await fetchHistory(convId)

    wsStatus.value = 'connecting'
    const ws = new WebSocket(`${CHAT_URL}/ws/admin/${convId}?atoken=${aToken.value}`)
    wsRef.value = ws

    ws.onopen = () => { wsStatus.value = 'open' }

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data)

            if (msg.id && seenMessageIds.value.has(msg.id)) return

            if (msg.id) seenMessageIds.value.add(msg.id)

            if (msg.event === 'admin_joined') {
                const alreadyHasJoin = messages.value.some(
                    m => m.event === 'admin_joined' || m.metadata?.intent === 'admin_joined'
                )
                if (alreadyHasJoin) return
            }

            messages.value.push({
                id: msg.id ?? `ws-${Date.now()}`,
                sender: msg.sender,
                content: msg.content,
                options: msg.options,
                metadata: msg.metadata,
                event: msg.event,
                createdAt: msg.createdAt,
            })
            scrollToBottom()
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
                        <img src="../../assets/chat_user_icon.svg" class="w-5 h-5 opacity-60" alt="" />
                        <p class="text-sm font-medium text-slate-700 truncate">
                            User …{{ (conv.userID ?? conv.userId ?? '??????').slice(-6) }}
                        </p>
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
                    <img src="../../assets/chat_user_icon.svg" class="w-6 h-6" alt="" />
                    <div>
                        <p class="text-sm font-semibold text-slate-700">
                            User …{{ activeConvId.slice(-6) }}
                        </p>
                        <div class="flex items-center gap-1.5">
                            <span :class="[
                                'w-2 h-2 rounded-full',
                                isConnected ? 'bg-green-400' : 'bg-slate-300 animate-pulse'
                            ]" />
                            <p class="text-xs text-slate-400 capitalize">{{ wsStatus }}</p>
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

                <template v-else>
                    <div v-for="msg in messages" :key="msg.id"
                        :class="['flex gap-2', msg.sender === 'admin' ? 'flex-row-reverse' : 'flex-row']">
                        <!-- avatar icon -->
                        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border" :class="msg.sender === 'admin'
                            ? 'bg-indigo-50 border-indigo-200'
                            : msg.sender === 'bot'
                                ? 'bg-indigo-50 border-indigo-100'
                                : 'bg-slate-50 border-slate-200'">
                            <img v-if="msg.sender === 'bot'" src="../../assets/chat_bot_icon.svg" class="w-4 h-4"
                                alt="bot" />
                            <img v-else-if="msg.sender === 'admin'" src="../../assets/chat_admin_icon.svg"
                                class="w-4 h-4" alt="admin" />
                            <img v-else src="../../assets/chat_user_icon.svg" class="w-4 h-4" alt="user" />
                        </div>

                        <div :class="[
                            'flex flex-col max-w-[75%]',
                            msg.sender === 'admin' ? 'items-end' : 'items-start'
                        ]">
                            <p class="text-[10px] text-slate-400 mb-0.5 px-1">
                                {{ senderLabel(msg.sender) }}
                            </p>
                            <div :class="[
                                'px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                                msg.sender === 'admin'
                                    ? 'bg-indigo-500 text-white rounded-tr-sm'
                                    : msg.sender === 'bot'
                                        ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                                        : 'bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-tl-sm'
                            ]">
                                {{ msg.content }}
                            </div>

                            <div v-if="msg.options?.length" class="flex flex-wrap gap-1.5 mt-1.5">
                                <span v-for="opt in msg.options" :key="opt.value"
                                    class="text-[10px] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-400 border border-indigo-100">
                                    {{ opt.label }}
                                </span>
                            </div>

                            <span class="text-[10px] text-slate-400 mt-0.5 px-1">
                                {{ formatTime(msg.createdAt) }}
                            </span>
                        </div>
                    </div>

                    <div ref="bottomEl" />
                </template>
            </div>

            <div v-if="activeConvId" class="px-4 py-3 border-t border-slate-200 bg-white flex gap-2 items-end">
                <textarea v-model="inputText" @keydown="handleKeyDown" rows="1" placeholder="Reply to user…"
                    :disabled="!isConnected" class="flex-1 resize-none text-sm border border-slate-300 rounded-xl px-3 py-2.5
                            focus:outline-none focus:ring-2 focus:ring-indigo-400
                            disabled:opacity-40 max-h-28" style="line-height:1.4" />
                <button @click="sendMessage" :disabled="!inputText.trim() || !isConnected" class="w-10 h-10 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40
                            text-white rounded-xl flex items-center justify-center
                            cursor-pointer transition-colors shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>