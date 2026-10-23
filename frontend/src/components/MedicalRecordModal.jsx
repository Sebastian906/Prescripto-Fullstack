import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatRecordDate, isSafeAttachmentUrl } from '../utils/medicalRecordPdf'

const MedicalRecordModal = ({ record, doctor, downloading, onClose, onDownload }) => {
    const { t, i18n } = useTranslation()
    const dialogRef = useRef(null)
    const closeButtonRef = useRef(null)

    useEffect(() => {
        const previouslyFocused = document.activeElement
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeButtonRef.current?.focus()

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
                return
            }
            if (event.key !== 'Tab') return

            const focusable = dialogRef.current?.querySelectorAll(
                'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
            )
            if (!focusable || focusable.length === 0) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = previousOverflow
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
        }
    }, [onClose])

    const attachments = Array.isArray(record.attachments)
        ? record.attachments.filter(isSafeAttachmentUrl)
        : []

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="medical-record-title"
                className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:shadow-xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-8">
                    <div className="min-w-0">
                        <h2 id="medical-record-title" className="text-lg font-semibold text-neutral-800">
                            {t(`diagnosis.${record.diagnosis}`, { defaultValue: t('diagnosis.unclassified-legacy') })}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500">
                            {t('myRecords.recordedOn')} {formatRecordDate(record.createdAt, i18n.language)}
                        </p>
                        <p className="text-xs text-zinc-500">
                            {doctor?.name ?? t('myRecords.doctor')}
                            {doctor?.speciality ? ` · ${doctor.speciality}` : ''}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label={t('myRecords.close')}
                        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-8">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {t('myRecords.notes')}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-zinc-700">
                        {record.notes || '—'}
                    </p>

                    {attachments.length > 0 && (
                        <div className="mt-6">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                                {t('myRecords.attachments')}
                            </p>
                            <ul className="mt-2 space-y-1">
                                {attachments.map((url) => (
                                    <li key={url}>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="break-all text-sm text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        >
                                            {url}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        type="button"
                        onClick={onDownload}
                        disabled={downloading}
                        className="min-h-11 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        {t('myRecords.downloadPdf')}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 rounded-full border border-indigo-500 px-6 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        {t('myRecords.close')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default MedicalRecordModal