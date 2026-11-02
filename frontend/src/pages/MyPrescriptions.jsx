import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useTranslation } from 'react-i18next'
import { AppContext } from '../context/AppContext'
import PrescriptionModal from '../components/PrescriptionModal'
import { downloadPrescriptionPdf, formatPrescriptionDate } from '../utils/prescriptionPdf'

const PAGE_SIZE = 10

const statusClasses = (revoked) =>
    revoked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'

const isRevoked = (prescription) =>
    Boolean(prescription?.revokedAt) || prescription?.status === 'revoked'

const MyPrescriptions = () => {
    const { backendUrl, token, doctors, userData } = useContext(AppContext)
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const [prescriptions, setPrescriptions] = useState([])
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(false)
    const [unavailable, setUnavailable] = useState(false)
    const [selected, setSelected] = useState(null)
    const [downloadingId, setDownloadingId] = useState(null)
    const requestIdRef = useRef(0)

    const loadPrescriptions = useCallback(async (nextOffset) => {
        if (!token) return

        const requestId = requestIdRef.current + 1
        requestIdRef.current = requestId

        if (nextOffset === 0) {
            setLoading(true)
        } else {
            setLoadingMore(true)
        }
        setError(false)
        setUnavailable(false)

        try {
            const { data } = await axios.get(backendUrl + '/api/prescriptions/mine', {
                headers: { token },
                params: { limit: PAGE_SIZE, offset: nextOffset },
            })

            if (requestId !== requestIdRef.current) return

            if (data.success) {
                const batch = Array.isArray(data.prescriptions) ? data.prescriptions : []
                setPrescriptions((previous) => {
                    const merged = nextOffset === 0 ? batch : [...previous, ...batch]
                    const seen = new Set()
                    return merged.filter((prescription) => {
                        if (seen.has(prescription._id)) return false
                        seen.add(prescription._id)
                        return true
                    })
                })
                setOffset(nextOffset + batch.length)
                setHasMore(batch.length === PAGE_SIZE)
            } else {
                setError(true)
            }
        } catch (requestError) {
            if (requestId !== requestIdRef.current) return
            const status = requestError?.response?.status
            if (status === 403 || status === 404) {
                setUnavailable(true)
            } else {
                if (status === 401) toast.error(i18n.t('myPrescriptions.error'))
                setError(true)
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false)
                setLoadingMore(false)
            }
        }
    }, [backendUrl, token, i18n])

    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true })
            return
        }
        loadPrescriptions(0)
        return () => {
            requestIdRef.current += 1
        }
    }, [token, loadPrescriptions, navigate])

    const doctorFor = (prescription) =>
        doctors.find((doctor) => doctor._id === prescription.doctorId) ?? null

    const handleDownload = async (prescription) => {
        const doctor = doctorFor(prescription)
        setDownloadingId(prescription._id)
        try {
            await downloadPrescriptionPdf({
                prescription,
                patientName: userData?.name,
                doctorName: doctor?.name,
                t,
                locale: i18n.language,
            })
        } catch {
            toast.error(t('myPrescriptions.downloadError'))
        } finally {
            setDownloadingId(null)
        }
    }

    const closeModal = useCallback(() => setSelected(null), [])

    if (!token) return null

    return (
        <div>
            <p className="pb-3 mt-12 font-medium text-zinc-700 border-b border-slate-400">
                {t('myPrescriptions.title')}
            </p>
            <p className="mt-3 text-sm text-zinc-500">{t('myPrescriptions.subtitle')}</p>
            <p className="mt-1 text-xs text-zinc-400">{t('myPrescriptions.confidential')}</p>

            <div className="mt-4">
                {loading && (
                    <div className="py-8 space-y-4" aria-live="polite">
                        <p className="text-sm text-zinc-500 animate-pulse">{t('myPrescriptions.loading')}</p>
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-12 rounded bg-indigo-50 animate-pulse" />
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <div className="py-10 text-center" role="alert">
                        <p className="text-sm text-zinc-500">{t('myPrescriptions.error')}</p>
                        <button
                            onClick={() => loadPrescriptions(0)}
                            className="mt-4 min-h-11 border border-indigo-500 text-indigo-600 rounded-full px-6 py-2.5 hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                            {t('myPrescriptions.retry')}
                        </button>
                    </div>
                )}

                {!loading && !error && unavailable && (
                    <p className="py-16 text-center text-sm text-zinc-500">{t('myPrescriptions.unavailable')}</p>
                )}

                {!loading && !error && !unavailable && prescriptions.length === 0 && (
                    <div className="py-16 text-center">
                        <p className="text-sm text-zinc-500">{t('myPrescriptions.empty')}</p>
                        <Link
                            to="/my-records"
                            className="mt-4 inline-flex min-h-11 items-center border border-indigo-500 text-indigo-600 rounded-full px-6 py-2.5 hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                            {t('myPrescriptions.emptyCta')}
                        </Link>
                    </div>
                )}

                {!loading && !error && !unavailable && prescriptions.length > 0 && (
                    <>
                        {prescriptions.map((prescription) => {
                            const doctor = doctorFor(prescription)
                            const revoked = isRevoked(prescription)
                            return (
                                <div
                                    key={prescription._id}
                                    className="flex flex-col gap-3 border-b border-slate-300 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(revoked)}`}>
                                                {revoked ? t('prescription.revoked') : t('prescription.active')}
                                            </span>
                                            <p className="font-semibold text-neutral-800">
                                                {doctor?.name ?? t('myPrescriptions.doctor')}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            {t('myPrescriptions.issuedOn')}{' '}
                                            {formatPrescriptionDate(prescription.issuedAt, i18n.language)} ·{' '}
                                            {prescription.items?.length ?? 0} {t('myPrescriptions.items')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelected(prescription)}
                                            className="min-h-11 cursor-pointer rounded-full border border-indigo-500 px-5 py-2 text-sm text-indigo-600 transition-all duration-300 hover:bg-indigo-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        >
                                            {t('myPrescriptions.view')}
                                        </button>
                                        <button
                                            onClick={() => handleDownload(prescription)}
                                            disabled={downloadingId === prescription._id}
                                            aria-label={`${t('myPrescriptions.downloadPdf')} — ${doctor?.name ?? t('myPrescriptions.doctor')}`}
                                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-indigo-500 text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {hasMore && (
                            <div className="flex justify-center py-6">
                                <button
                                    onClick={() => loadPrescriptions(offset)}
                                    disabled={loadingMore}
                                    className="min-h-11 border border-indigo-500 text-indigo-600 rounded-full px-6 py-2.5 hover:bg-indigo-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                >
                                    {loadingMore ? t('myPrescriptions.loading') : t('myPrescriptions.loadMore')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selected && (
                <PrescriptionModal
                    prescription={selected}
                    doctor={doctorFor(selected)}
                    downloading={downloadingId === selected._id}
                    onClose={closeModal}
                    onDownload={() => handleDownload(selected)}
                />
            )}
        </div>
    )
}
export default MyPrescriptions
