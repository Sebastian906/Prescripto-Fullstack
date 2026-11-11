import { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppContext } from '../context/AppContext'
import StarRating from './StarRating'

const MAX_COMMENT = 500
const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const ReviewModal = ({ appointmentId, onClose, onSaved }) => {
    const { backendUrl, token } = useContext(AppContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [existing, setExisting] = useState(null)
    const [score, setScore] = useState(0)
    const [comment, setComment] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [canEdit, setCanEdit] = useState(true)

    useEffect(() => {
        let active = true
        const load = async () => {
            try {
                const { data } = await axios.get(
                    `${backendUrl}/api/reviews/appointment/${appointmentId}`,
                    { headers: { token } },
                )
                if (!active) return
                if (data?.success && data.review) {
                    setExisting(data.review)
                    setScore(data.review.score)
                    setComment(data.review.comment || '')
                    const age = Date.now() - new Date(data.review.createdAt).getTime()
                    setCanEdit(age <= EDIT_WINDOW_MS)
                }
            } catch (err) {
                if (!active) return
                if (err?.response?.status !== 404) {
                    setError(err?.response?.data?.message || t('reviews.loadError'))
                }
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [appointmentId, backendUrl, token, t])

    const valid = Number.isInteger(score)
        && score >= 1
        && score <= 5
        && comment.length <= MAX_COMMENT

    /** Clear the session and redirect when the backend rejects the token. */
    const handleAuthError = (err) => {
        const status = err?.response?.status
        if (status !== 401 && status !== 403) return false
        localStorage.removeItem('token')
        toast.warn(t('reviews.sessionExpired'))
        navigate('/login')
        return true
    }

    const submit = async (event) => {
        event.preventDefault()
        if (!valid || !canEdit || saving) return
        setSaving(true)
        setError('')
        try {
            if (existing) {
                await axios.patch(
                    `${backendUrl}/api/reviews/${existing.id}`,
                    { score, comment },
                    { headers: { token } },
                )
                toast.success(t('reviews.updated'))
            } else {
                await axios.post(
                    `${backendUrl}/api/reviews`,
                    { appointmentId, score, comment },
                    { headers: { token } },
                )
                toast.success(t('reviews.created'))
            }
            onSaved?.()
        } catch (err) {
            if (handleAuthError(err)) return
            const status = err?.response?.status
            const data = err?.response?.data
            if (status === 409) {
                setError(t('reviews.alreadyReviewed'))
            } else if (status === 400 && data?.code === 'PHI_DETECTED') {
                setError(data.message || t('reviews.phi'))
            } else {
                setError(data?.message || t('reviews.saveError'))
            }
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        if (!existing || saving) return
        if (!window.confirm(t('reviews.deleteConfirm'))) return
        setSaving(true)
        setError('')
        try {
            await axios.delete(`${backendUrl}/api/reviews/${existing.id}`, {
                headers: { token },
            })
            toast.success(t('reviews.deleted'))
            onSaved?.()
        } catch (err) {
            if (!handleAuthError(err)) {
                setError(err?.response?.data?.message || t('reviews.deleteError'))
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-modal-title"
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <h2 id="review-modal-title" className="text-lg font-medium text-slate-800">
                        {existing ? t('reviews.editTitle') : t('reviews.title')}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-10 rounded px-2 text-sm text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        {t('reviews.close')}
                    </button>
                </div>

                {loading ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                        {t('reviews.loading')}
                    </p>
                ) : (
                    <form className="mt-4 space-y-4" onSubmit={submit}>
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">
                                {t('reviews.scoreLabel')}
                            </p>
                            <StarRating value={score} onChange={setScore} />
                        </div>

                        <div>
                            <label htmlFor="review-comment" className="mb-1 block text-sm font-medium text-slate-700">
                                {t('reviews.commentLabel')}
                            </label>
                            <textarea
                                id="review-comment"
                                value={comment}
                                maxLength={MAX_COMMENT}
                                onChange={(event) => setComment(event.target.value)}
                                placeholder={t('reviews.commentPlaceholder')}
                                rows={4}
                                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <p className="mt-1 text-right text-xs text-slate-400">
                                {t('reviews.characters', { used: comment.length })}
                            </p>
                        </div>

                        {error && (
                            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                                {error}
                            </p>
                        )}

                        {!canEdit && (
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                {t('reviews.windowExpired')}
                            </p>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            {existing && (
                                <button
                                    type="button"
                                    onClick={remove}
                                    disabled={!canEdit || saving}
                                    className="min-h-11 rounded-full border border-red-500 px-5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {t('reviews.delete')}
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={!valid || !canEdit || saving}
                                className="min-h-11 rounded-full bg-indigo-600 px-6 text-sm text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {saving
                                    ? t('reviews.saving')
                                    : existing
                                        ? t('reviews.update')
                                        : t('reviews.submit')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ReviewModal