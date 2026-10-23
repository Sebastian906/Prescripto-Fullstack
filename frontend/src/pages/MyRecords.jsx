import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useTranslation } from 'react-i18next'
import { AppContext } from '../context/AppContext'
import MedicalRecordModal from '../components/MedicalRecordModal'
import { downloadMedicalRecordPdf, formatRecordDate } from '../utils/medicalRecordPdf'

const PAGE_SIZE = 10

const MyRecords = () => {
    const { backendUrl, token, doctors, userData } = useContext(AppContext)
    const { t, i18n } = useTranslation()

    const [records, setRecords] = useState([])
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(false)
    const [unavailable, setUnavailable] = useState(false)
    const [selected, setSelected] = useState(null)
    const [downloadingId, setDownloadingId] = useState(null)
    const requestIdRef = useRef(0)

    const loadRecords = useCallback(async (nextOffset) => {
        if (!token) {
            requestIdRef.current += 1
            setRecords([])
            setOffset(0)
            setSelected(null)
            setHasMore(false)
            setLoading(false)
            return
        }

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
            const { data } = await axios.get(backendUrl + '/api/medical-records/mine', {
                headers: { token },
                params: { limit: PAGE_SIZE, offset: nextOffset },
            })

            if (requestId !== requestIdRef.current) return

            if (data.success) {
                const batch = Array.isArray(data.records) ? data.records : []
                setRecords((previous) => {
                    const merged = nextOffset === 0 ? batch : [...previous, ...batch]
                    const seen = new Set()
                    return merged.filter((record) => {
                        if (seen.has(record._id)) return false
                        seen.add(record._id)
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
                if (status === 401) toast.error(i18n.t('myRecords.error'))
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
        loadRecords(0)
        return () => {
            requestIdRef.current += 1
        }
    }, [token, loadRecords])

    const diagnosisLabel = (code) => t(`diagnosis.${code}`, { defaultValue: t('diagnosis.unclassified-legacy') })

    const doctorFor = (record) => doctors.find((doctor) => doctor._id === record.doctorId) ?? null

    const pdfLabels = useMemo(() => ({
        title: t('myRecords.pdfTitle'),
        doctor: t('myRecords.doctor'),
        diagnosis: t('myRecords.diagnosis'),
        recordedOn: t('myRecords.recordedOn'),
        notes: t('myRecords.notes'),
        attachments: t('myRecords.attachments'),
        pdfConfidential: t('myRecords.pdfConfidential'),
        page: t('myRecords.page'),
        of: t('myRecords.of'),
    }), [t])

    const handleDownload = async (record) => {
        const doctor = doctorFor(record)
        setDownloadingId(record._id)
        try {
            await downloadMedicalRecordPdf({
                record,
                patientName: userData?.name,
                doctorName: doctor?.name,
                speciality: doctor?.speciality,
                diagnosisLabel: diagnosisLabel(record.diagnosis),
                labels: pdfLabels,
                locale: i18n.language,
            })
        } catch {
            toast.error(t('myRecords.downloadError'))
        } finally {
            setDownloadingId(null)
        }
    }

    const closeModal = useCallback(() => setSelected(null), [])

    return (
        <div>
            <p className="pb-3 mt-12 font-medium text-zinc-700 border-b border-slate-400">
                {t('myRecords.title')}
            </p>
            <p className="mt-3 text-sm text-zinc-500">{t('myRecords.subtitle')}</p>
            <p className="mt-1 text-xs text-zinc-400">{t('myRecords.confidential')}</p>

            <div className="mt-4">
                {loading && (
                    <div className="py-8 space-y-4" aria-live="polite">
                        <p className="text-sm text-zinc-500 animate-pulse">{t('myRecords.loading')}</p>
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-12 rounded bg-indigo-50 animate-pulse" />
                        ))}
                    </div>
                )}

                {!loading && !token && (
                    <p className="py-16 text-center text-sm text-zinc-500">{t('myRecords.unavailable')}</p>
                )}

                {!loading && token && error && (
                    <div className="py-10 text-center" role="alert">
                        <p className="text-sm text-zinc-500">{t('myRecords.error')}</p>
                        <button
                            onClick={() => loadRecords(0)}
                            className="mt-4 min-h-11 border border-indigo-500 text-indigo-600 rounded-full px-6 py-2.5 hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                            {t('myRecords.retry')}
                        </button>
                    </div>
                )}

                {!loading && token && !error && unavailable && (
                    <p className="py-16 text-center text-sm text-zinc-500">{t('myRecords.unavailable')}</p>
                )}

                {!loading && token && !error && !unavailable && records.length === 0 && (
                    <div className="py-16 text-center">
                        <p className="text-sm text-zinc-500">{t('myRecords.empty')}</p>
                        <Link
                            to="/my-appointments"
                            className="mt-4 inline-flex min-h-11 items-center border border-indigo-500 text-indigo-600 rounded-full px-6 py-2.5 hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                            {t('myRecords.emptyCta')}
                        </Link>
                    </div>
                )}

                {!loading && token && !error && !unavailable && records.length > 0 && (
                    <>
                        {records.map((record) => {
                            const doctor = doctorFor(record)
                            return (
                                <div
                                    key={record._id}
                                    className="flex flex-col gap-3 border-b border-slate-300 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-neutral-800">
                                            {doctor?.name ?? t('myRecords.doctor')}
                                        </p>
                                        {doctor?.speciality && (
                                            <p className="text-xs text-zinc-500">{doctor.speciality}</p>
                                        )}
                                        <p className="mt-1 text-xs text-zinc-500">
                                            {diagnosisLabel(record.diagnosis)} · {t('myRecords.recordedOn')}{' '}
                                            {formatRecordDate(record.createdAt, i18n.language)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelected(record)}
                                            className="min-h-11 cursor-pointer rounded-full border border-indigo-500 px-5 py-2 text-sm text-indigo-600 transition-all duration-300 hover:bg-indigo-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        >
                                            {t('myRecords.view')}
                                        </button>
                                        <button
                                            onClick={() => handleDownload(record)}
                                            disabled={downloadingId === record._id}
                                            aria-label={`${t('myRecords.downloadPdf')} — ${diagnosisLabel(record.diagnosis)}`}
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
                                    onClick={() => loadRecords(offset)}
                                    disabled={loadingMore}
                                    className="min-h-11 border border-indigo-500 text-indigo-600 rounded-full px-6 py-2.5 hover:bg-indigo-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                >
                                    {loadingMore ? t('myRecords.loading') : t('myRecords.loadMore')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selected && (
                <MedicalRecordModal
                    record={selected}
                    doctor={doctorFor(selected)}
                    downloading={downloadingId === selected._id}
                    onClose={closeModal}
                    onDownload={() => handleDownload(selected)}
                />
            )}
        </div>
    )
}

export default MyRecords