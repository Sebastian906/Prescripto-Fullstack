<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminContext } from '../../context/AdminContext'
import { useToast } from 'vue-toastification'
import axios from 'axios'

const { backendUrl, aToken } = useAdminContext()
const { t } = useI18n()
const toast = useToast()

const tree = ref([])
const loading = ref(false)

const showForm = ref(false)
const editingId = ref(null)
const form = ref({ name: '', slug: '', parentId: null, description: '' })

const flatTree = computed(() => {
    const result = []
    const flatten = (nodes, depth = 0) => {
        for (const node of nodes) {
            result.push({ ...node, depth })
            if (node.children?.length) flatten(node.children, depth + 1)
        }
    }
    flatten(tree.value)
    return result
})

const parentOptions = computed(() =>
    flatTree.value.map((node) => ({
        id: node.id,
        label: '—'.repeat(node.depth) + ' ' + node.name,
    }))
)

const fetchTree = async () => {
    loading.value = true
    try {
        const { data } = await axios.get(`${backendUrl}/api/specialities/tree`)
        if (data.success) tree.value = data.tree
    } catch {
        toast.error(t('specialities.couldNotLoad'))
    } finally {
        loading.value = false
    }
}

const autoSlug = () => {
    form.value.slug = form.value.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
}

const openCreate = (parentId = null) => {
    editingId.value = null
    form.value = { name: '', slug: '', parentId, description: '' }
    showForm.value = true
}

const openEdit = (node) => {
    editingId.value = node.id
    form.value = {
        name: node.name,
        slug: node.slug,
        parentId: node.parentId ?? null,
        description: node.metadata?.description ?? '',
    }
    showForm.value = true
}

const submitForm = async () => {
    if (!form.value.name || !form.value.slug) {
        toast.error(t('specialities.nameSlugRequired'))
        return
    }
    try {
        if (editingId.value) {
            await axios.patch(`${backendUrl}/api/specialities/${editingId.value}`, form.value, { headers: { atoken: aToken.value } })
            toast.success(t('specialities.updated'))
        } else {
            await axios.post(`${backendUrl}/api/specialities`, form.value, { headers: { atoken: aToken.value } })
            toast.success(t('specialities.created'))
        }
        showForm.value = false
        await fetchTree()
    } catch (err) {
        toast.error(err?.response?.data?.message ?? t('specialities.operationFailed'))
    }
}

const removeNode = async (id) => {
    if (!confirm(t('specialities.deactivateConfirm'))) return
    try {
        await axios.delete(`${backendUrl}/api/specialities/${id}`, { headers: { atoken: aToken.value } })
        toast.success(t('specialities.deactivated'))
        await fetchTree()
    } catch {
        toast.error(t('specialities.couldNotDeactivate'))
    }
}

onMounted(fetchTree)
</script>

<template>
    <div class="m-5 w-full max-w-4xl">
        <div class="flex justify-between items-center mb-4">
            <p class="text-lg font-medium">{{ t('specialities.title') }}</p>
            <button @click="openCreate()"
                class="bg-indigo-500 text-white text-sm px-5 py-2 rounded-full hover:bg-indigo-600 transition-colors cursor-pointer">
                {{ t('specialities.addRoot') }}
            </button>
        </div>

        <div class="bg-white rounded-lg border overflow-hidden">
            <div
                class="grid grid-cols-[2fr_1fr_0.5fr_auto] px-6 py-3 border-b text-xs font-medium text-gray-400 uppercase">
                <p>{{ t('specialities.name') }}</p>
                <p>{{ t('specialities.slug') }}</p>
                <p>{{ t('specialities.level') }}</p>
                <p>{{ t('specialities.actions') }}</p>
            </div>

            <div v-if="loading" class="text-center py-10 text-slate-400 text-sm animate-pulse">
                {{ t('specialities.loading') }}
            </div>

            <div v-for="node in flatTree" :key="node.id"
                class="grid grid-cols-[2fr_1fr_0.5fr_auto] items-center px-6 py-3 border-b hover:bg-indigo-50 transition-colors">
                <p :style="{ paddingLeft: `${node.depth * 20}px` }"
                    class="flex items-center gap-1 text-gray-700 text-sm">
                    <span v-if="node.depth > 0" class="text-indigo-300 text-xs">└</span>
                    {{ node.name }}
                </p>

                <p class="text-xs text-slate-400">{{ node.slug }}</p>

                <span class="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs w-fit">
                    L{{ node.depth }}
                </span>

                <div class="flex items-center gap-2">
                    <button @click="openCreate(node.id)"
                        class="text-xs text-indigo-400 hover:text-indigo-600 cursor-pointer"
                        :title="t('specialities.addChild')">
                        {{ t('specialities.addChild') }}
                    </button>
                    <button @click="openEdit(node)" class="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                        :title="t('specialities.edit')">
                        {{ t('specialities.edit') }}
                    </button>
                    <button @click="removeNode(node.id)" class="text-xs text-red-300 hover:text-red-500 cursor-pointer"
                        :title="t('specialities.deactivate')">
                        ✕
                    </button>
                </div>
            </div>

            <p v-if="!loading && flatTree.length === 0" class="text-center py-10 text-slate-400 text-sm">
                {{ t('specialities.noSpecialities') }}
            </p>
        </div>

        <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            @click.self="showForm = false">
            <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
                <h2 class="text-xl font-semibold text-slate-800 mb-5">
                    {{ editingId ? t('specialities.editSpeciality') : t('specialities.newSpeciality') }}
                </h2>

                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-gray-600">{{ t('specialities.nameLabel') }}</label>
                        <input v-model="form.name" @input="autoSlug" type="text"
                            :placeholder="t('specialities.namePlaceholder')"
                            class="border rounded px-3 py-2 text-sm focus:outline-indigo-400" />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-gray-600">{{ t('specialities.slugLabel') }}</label>
                        <input v-model="form.slug" type="text" :placeholder="t('specialities.slugPlaceholder')"
                            class="border rounded px-3 py-2 text-sm focus:outline-indigo-400 text-slate-400" />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-gray-600">{{ t('specialities.parentLabel') }}</label>
                        <select v-model="form.parentId"
                            class="border rounded px-3 py-2 text-sm focus:outline-indigo-400">
                            <option :value="null">{{ t('specialities.noneRoot') }}</option>
                            <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id">
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-sm text-gray-600">{{ t('specialities.descLabel') }}</label>
                        <textarea v-model="form.description" :placeholder="t('specialities.descPlaceholder')" rows="2"
                            class="border rounded px-3 py-2 text-sm focus:outline-indigo-400" />
                    </div>
                </div>

                <div class="flex gap-3 mt-6">
                    <button @click="submitForm"
                        class="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                        {{ editingId ? t('specialities.saveChanges') : t('specialities.create') }}
                    </button>
                    <button @click="showForm = false"
                        class="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-600 py-2 rounded-lg text-sm transition-colors cursor-pointer">
                        {{ t('specialities.cancel') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>