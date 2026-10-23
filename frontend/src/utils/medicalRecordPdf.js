const INDIGO = [99, 102, 241]
const SLATE_900 = [15, 23, 42]
const SLATE_700 = [51, 65, 85]
const SLATE_500 = [100, 116, 139]
const SLATE_200 = [226, 232, 240]
const WHITE = [255, 255, 255]

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const HEADER_HEIGHT = 22
const FOOTER_HEIGHT = 9
const CONTENT_TOP = HEADER_HEIGHT + 12
const CONTENT_BOTTOM = PAGE_HEIGHT - FOOTER_HEIGHT - 10

export function isSafeAttachmentUrl(value) {
    if (typeof value !== 'string') return false
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

export function formatRecordDate(value, locale = 'en') {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' })
}

function drawHeader(doc, title) {
    doc.setFillColor(...INDIGO)
    doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('PRESCRIPTO', MARGIN, 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(title, MARGIN, 19)
}

export async function downloadMedicalRecordPdf({
    record,
    patientName,
    doctorName,
    speciality,
    diagnosisLabel,
    labels,
    locale = 'en',
}) {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const attachments = Array.isArray(record?.attachments)
        ? record.attachments.filter(isSafeAttachmentUrl)
        : []

    drawHeader(doc, labels.title)
    let cursorY = CONTENT_TOP

    const ensureSpace = (height) => {
        if (cursorY + height <= CONTENT_BOTTOM) return
        doc.addPage()
        drawHeader(doc, labels.title)
        cursorY = CONTENT_TOP
    }

    doc.setTextColor(...SLATE_900)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(patientName || '—', MARGIN, cursorY)
    cursorY += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...SLATE_700)
    const doctorLine = speciality
        ? `${doctorName || labels.doctor} — ${speciality}`
        : doctorName || labels.doctor
    doc.text(doctorLine, MARGIN, cursorY)
    cursorY += 5

    doc.setTextColor(...SLATE_500)
    doc.text(`${labels.recordedOn}: ${formatRecordDate(record?.createdAt, locale)}`, MARGIN, cursorY)
    cursorY += 7

    doc.setDrawColor(...SLATE_200)
    doc.line(MARGIN, cursorY, PAGE_WIDTH - MARGIN, cursorY)
    cursorY += 8

    doc.setTextColor(...SLATE_500)
    doc.setFontSize(8)
    doc.text(labels.diagnosis.toUpperCase(), MARGIN, cursorY)
    cursorY += 5

    doc.setTextColor(...SLATE_900)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(diagnosisLabel || '—', MARGIN, cursorY)
    cursorY += 9

    doc.setTextColor(...SLATE_500)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(labels.notes.toUpperCase(), MARGIN, cursorY)
    cursorY += 5

    doc.setTextColor(...SLATE_700)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const noteLines = doc.splitTextToSize(String(record?.notes || '—'), CONTENT_WIDTH)
    noteLines.forEach((line) => {
        ensureSpace(5)
        doc.text(line, MARGIN, cursorY)
        cursorY += 5
    })

    if (attachments.length > 0) {
        cursorY += 4
        ensureSpace(10)

        doc.setTextColor(...SLATE_500)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text(labels.attachments.toUpperCase(), MARGIN, cursorY)
        cursorY += 5

        doc.setTextColor(...SLATE_700)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        attachments.forEach((url) => {
            const urlLines = doc.splitTextToSize(url, CONTENT_WIDTH)
            urlLines.forEach((line) => {
                ensureSpace(4)
                doc.text(line, MARGIN, cursorY)
                cursorY += 4
            })
        })
    }

    const totalPages = doc.getNumberOfPages()
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page)
        doc.setFillColor(...INDIGO)
        doc.rect(0, PAGE_HEIGHT - FOOTER_HEIGHT, PAGE_WIDTH, FOOTER_HEIGHT, 'F')
        doc.setTextColor(...WHITE)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.text(labels.pdfConfidential, MARGIN, PAGE_HEIGHT - 3)
        doc.text(
            `${labels.page} ${page} ${labels.of} ${totalPages}`,
            PAGE_WIDTH - MARGIN,
            PAGE_HEIGHT - 3,
            { align: 'right' },
        )
    }

    const shortId = String(record?._id || 'record').replace(/[^a-zA-Z0-9]/g, '').slice(-6) || 'record'
    doc.save(`prescripto-medical-record-${shortId}.pdf`)
}