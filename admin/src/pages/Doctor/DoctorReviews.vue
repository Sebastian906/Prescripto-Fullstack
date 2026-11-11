<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDoctorContext } from '../../context/DoctorContext'

const { dToken, reviews, reviewsLoading, reviewsError, getReviews } = useDoctorContext()
const { t, locale } = useI18n()

const PAGE_SIZE = 10
const currentPage = ref(1)

const totalPages = computed(() =>
    Math.max(1, Math.ceil(reviews.value.length / PAGE_SIZE)),
)

const paginatedReviews = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return reviews.value.slice(start, start + PAGE_SIZE)
})

const showingFrom = computed(() =>
    reviews.value.length === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const showingTo = computed(() =>
    Math.min(currentPage.value * PAGE_SIZE, reviews.value.length),
)

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString(locale.value)
}

onMounted(() => {
    if (dToken.value) {
        getReviews()
    }
})
</script>

<template>
    <div class="w-full max-w-5xl m-5">
        <p class="mb-3 text-lg font-medium">{{ t('doctorReviews.title') }}</p>

        <p v-if="reviewsLoading" class="text-sm text-slate-400 animate-pulse">
            {{ t('doctorReviews.loading') }}
        </p>
        <p v-else-if="reviewsError" class="text-sm text-red-600">
            {{ t('doctorReviews.error') }}
        </p>
        <p v-else-if="reviews.length === 0" class="text-sm text-slate-500">
            {{ t('doctorReviews.empty') }}
        </p>

        <div v-else class="bg-slate-100 border rounded text-sm">
            <div
                class="hidden sm:grid grid-cols-[1fr_3fr_1fr_1fr] gap-2 py-3 px-6 border-b font-medium text-gray-600">
                <p>{{ t('doctorReviews.score') }}</p>
                <p>{{ t('doctorReviews.comment') }}</p>
                <p>{{ t('doctorReviews.date') }}</p>
                <p>{{ t('doctorReviews.appointment') }}</p>
            </div>

            <div v-for="item in paginatedReviews" :key="item.id"
                class="flex flex-col gap-1 sm:grid grid-cols-[1fr_3fr_1fr_1fr] sm:gap-2 sm:items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-200">
                <p role="img" class="text-amber-500"
                    :aria-label="t('doctorReviews.ratingLabel', { rating: item.score })">
                    <span aria-hidden="true">{{ '★'.repeat(item.score) }}</span>
                </p>
                <p class="break-words">{{ item.comment || t('doctorReviews.noComment') }}</p>
                <p>{{ formatDate(item.createdAt) }}</p>
                <p class="text-xs">#{{ item.appointmentId?.slice(-6) }}</p>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-xs text-gray-500">
                <p>
                    {{ t('doctorReviews.showing', { from: showingFrom, to: showingTo, total: reviews.length }) }}
                </p>
                <div class="flex gap-2">
                    <button type="button" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)"
                        class="rounded border border-slate-400 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ t('doctorReviews.previous') }}
                    </button>
                    <button type="button" :disabled="currentPage === totalPages"
                        @click="goToPage(currentPage + 1)"
                        class="rounded border border-slate-400 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ t('doctorReviews.next') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>