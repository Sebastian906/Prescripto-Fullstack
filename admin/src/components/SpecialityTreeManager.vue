<script setup>
import { ref, computed } from 'vue'
import { useAdminContext } from '../context/AdminContext'
import axios from 'axios'

const { backendUrl, aToken } = useAdminContext()

const tree = ref([])
const loading = ref(false)
const selected = ref(null)

const fetchTree = async () => {
    loading.value = true
    const { data } = await axios.get(`${backendUrl}/api/specialities/tree`)
    if (data.success) tree.value = data.tree
    loading.value = false
}

/**
 * Computed recursivo: lista plana con metadatos de profundidad.
 * Vue cachea este valor y sólo lo recalcula si `tree` cambia.
 * Equivalente a flattenTree del hook React — O(n).
 */
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

fetchTree()
</script>

<template>
    <div class="bg-white rounded-lg border p-4">
        <div class="flex justify-between items-center mb-4">
            <h3 class="font-semibold text-gray-700">Speciality Hierarchy</h3>
            <button
                @click="fetchTree"
                class="text-xs text-indigo-500 hover:underline cursor-pointer"
            >
                Refresh
            </button>
        </div>

        <div v-if="loading" class="text-sm text-slate-400 animate-pulse">
            Building tree…
        </div>

        <table v-else class="w-full text-sm text-gray-600">
            <thead>
                <tr class="border-b text-left text-xs text-gray-400 uppercase">
                    <th class="py-2">Name</th>
                    <th class="py-2">Slug</th>
                    <th class="py-2">Level</th>
                    <th class="py-2">Doctors</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="node in flatTree"
                    :key="node.id"
                    class="border-b hover:bg-indigo-50 transition-colors cursor-pointer"
                    @click="selected = node"
                >
                    <td class="py-2">
                        <span
                          :style="{ paddingLeft: `${node.depth * 16}px` }"
                            class="flex items-center gap-1"
                        >
                            <span v-if="node.depth > 0" class="text-indigo-200">└</span>
                            {{ node.name }}
                        </span>
                    </td>
                    <td class="py-2 text-slate-400 text-xs">{{ node.slug }}</td>
                    <td class="py-2">
                        <span class="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs">
                            L{{ node.depth }}
                        </span>
                    </td>
                    <td class="py-2 text-slate-500">
                        {{ node.metadata?.doctorCount ?? '—' }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>