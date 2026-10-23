import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

export function formatMedicalRecordDate(value, locale) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function medicalRecordDiagnosisLabel(code, t, te) {
    const fallbackKey = 'diagnosis.unclassified-legacy'
    if (!code) return t(fallbackKey)
    const key = `diagnosis.${code}`
    return te(key) ? t(key) : t(fallbackKey)
}

export function isSafeMedicalRecordUrl(value) {
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

export function useMedicalRecordExport() {
    const exporting = ref(false)
    const { t, te, locale } = useI18n()

    const formatDate = (value) => formatMedicalRecordDate(value, locale.value)
    const diagnosisLabel = (code) => medicalRecordDiagnosisLabel(code, t, te)

    async function exportMedicalRecordPDF(record, { patientName, doctorName } = {}) {
        if (!record) return
        exporting.value = true
        try {
            const { default: jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()
            const margin = 14
            const bottom = pageHeight - 18
            const indigo = [79, 70, 229]
            const slate = [51, 65, 85]
            const muted = [100, 116, 139]
            let y = 0

            doc.setFillColor(...indigo)
            doc.rect(0, 0, pageWidth, 24, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(16)
            doc.text('PRESCRIPTO', margin, 13)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.text(t('doctorRecords.pdfTitle'), margin, 19)
            doc.setFontSize(8)
            doc.text(t('doctorRecords.confidential'), pageWidth - margin, 13, { align: 'right' })

            y = 34
            const meta = [
                [t('doctorRecords.patient'), patientName || t('doctorRecords.unknownPatient')],
                [t('doctorRecords.doctor'), doctorName || t('doctorRecords.unknownDoctor')],
                [t('doctorRecords.date'), formatDate(record.createdAt)],
                [t('doctorRecords.diagnosis'), diagnosisLabel(record.diagnosis)],
            ]
            const columnWidth = (pageWidth - margin * 2 - 6) / 2

            meta.forEach(([label, value], index) => {
                const column = index % 2
                const row = Math.floor(index / 2)
                const x = margin + column * (columnWidth + 6)
                const boxY = y + row * 18

                doc.setFillColor(238, 242, 255)
                doc.roundedRect(x, boxY, columnWidth, 14, 2, 2, 'F')
                doc.setTextColor(...muted)
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(7)
                doc.text(label.toUpperCase(), x + 3, boxY + 5)

                doc.setTextColor(...slate)
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(9)
                const lines = doc.splitTextToSize(String(value), columnWidth - 6)
                doc.text(lines.slice(0, 1), x + 3, boxY + 10)
            })

            y += 42
            doc.setTextColor(...slate)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(11)
            doc.text(t('doctorRecords.notes'), margin, y)
            y += 6

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            const notes = doc.splitTextToSize(
                record.notes?.trim() || t('doctorRecords.noNotes'),
                pageWidth - margin * 2
            )
            const lineHeight = 5

            for (const line of notes) {
                if (y + lineHeight > bottom) {
                    doc.addPage()
                    y = 20
                }
                doc.text(line, margin, y)
                y += lineHeight
            }

            const attachments = Array.isArray(record.attachments)
                ? record.attachments.filter(isSafeMedicalRecordUrl)
                : []

            if (attachments.length > 0) {
                y += 6
                if (y + 8 > bottom) {
                    doc.addPage()
                    y = 20
                }
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(11)
                doc.text(t('doctorRecords.attachments'), margin, y)
                y += 6
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(9)

                attachments.forEach((url, index) => {
                    const lines = doc.splitTextToSize(
                        `${t('doctorRecords.attachment')} ${index + 1}: ${url}`,
                        pageWidth - margin * 2
                    )
                    for (const line of lines) {
                        if (y + 4.5 > bottom) {
                            doc.addPage()
                            y = 20
                        }
                        doc.text(line, margin, y)
                        y += 4.5
                    }
                })
            }

            const totalPages = doc.internal.getNumberOfPages()
            for (let page = 1; page <= totalPages; page++) {
                doc.setPage(page)
                doc.setFillColor(...indigo)
                doc.rect(0, pageHeight - 8, pageWidth, 8, 'F')
                doc.setTextColor(255, 255, 255)
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(7)
                doc.text(t('doctorRecords.confidential'), margin, pageHeight - 3)
                doc.text(
                    `${t('doctorRecords.page')} ${page} ${t('doctorRecords.ofPages')} ${totalPages}`,
                    pageWidth - margin,
                    pageHeight - 3,
                    { align: 'right' }
                )
            }

            doc.save(`medical-record-${record._id || 'export'}.pdf`)
        } finally {
            exporting.value = false
        }
    }

    return { exportMedicalRecordPDF, exporting }
}