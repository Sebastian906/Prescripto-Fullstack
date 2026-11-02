import { formatRecordDate } from './medicalRecordPdf'

export const formatPrescriptionDate = formatRecordDate

const INDIGO = [99, 102, 241]
const SLATE_900 = [15, 23, 42]
const SLATE_700 = [51, 65, 85]
const SLATE_500 = [100, 116, 139]
const SLATE_200 = [226, 232, 240]
const WHITE = [255, 255, 255]
const ROSE_600 = [225, 29, 72]

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const HEADER_HEIGHT = 22
const FOOTER_HEIGHT = 9
const CONTENT_TOP = HEADER_HEIGHT + 12
const CONTENT_BOTTOM = PAGE_HEIGHT - FOOTER_HEIGHT - 10

const COLUMNS = [
    { key: 'drug', width: 72 },
    { key: 'dose', width: 42 },
    { key: 'frequency', width: 50 },
    { key: 'days', width: 18 },
]

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
export async function downloadPrescriptionPdf({
    prescription,
    patientName,
    doctorName,
    t,
    locale = 'en',
}) {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const revoked = Boolean(prescription?.revokedAt) || prescription?.status === 'revoked'
    const items = Array.isArray(prescription?.items) ? prescription.items : []
    drawHeader(doc, t('prescription.pdfTitle'))
    let cursorY = CONTENT_TOP

    const newPage = () => {
        doc.addPage()
        drawHeader(doc, t('prescription.pdfTitle'))
        cursorY = CONTENT_TOP
    }

    const ensureSpace = (height) => {
        if (cursorY + height > CONTENT_BOTTOM) newPage()
    }

    doc.setTextColor(...SLATE_900)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(patientName || '—', MARGIN, cursorY)
    cursorY += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...SLATE_700)
    doc.text(`${t('prescription.doctor')}: ${doctorName || '—'}`, MARGIN, cursorY)
    cursorY += 5

    doc.setTextColor(...SLATE_500)
    doc.text(`${t('prescription.issuedAt')}: ${formatPrescriptionDate(prescription?.issuedAt, locale)}`, MARGIN, cursorY)
    cursorY += 5
    doc.text(
        `${t('prescription.status')}: ${revoked ? t('prescription.revoked') : t('prescription.active')}`,
        MARGIN,
        cursorY,
    )
    cursorY += 5

    if (revoked) {
        doc.setTextColor(...ROSE_600)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(t('prescription.revokedMarker'), MARGIN, cursorY)
        cursorY += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(
            `${t('prescription.revokedAt')}: ${formatPrescriptionDate(prescription?.revokedAt, locale)}`,
            MARGIN,
            cursorY,
        )
        cursorY += 5
    }

    cursorY += 4

    const drawTableHeader = () => {
        ensureSpace(7)
        doc.setFillColor(...SLATE_200)
        doc.rect(MARGIN, cursorY, CONTENT_WIDTH, 7, 'F')
        doc.setTextColor(...SLATE_700)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        let x = MARGIN + 2
        COLUMNS.forEach((column) => {
            doc.text(t(`prescription.${column.key}`).toUpperCase(), x, cursorY + 4.5)
            x += column.width
        })
        cursorY += 7
    }

    const drawItemRow = (item) => {
        // measure with the font used to draw, otherwise wrapping differs
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const cells = COLUMNS.map((column) =>
            doc.splitTextToSize(String(item?.[column.key] ?? '—'), column.width - 4),
        )
        const rowHeight = Math.max(...cells.map((lines) => lines.length)) * 4.2 + 4
        if (cursorY + rowHeight > CONTENT_BOTTOM) {
            newPage()
            drawTableHeader()
        }

        doc.setTextColor(...SLATE_700)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        let x = MARGIN + 2
        cells.forEach((lines, index) => {
            doc.text(lines, x, cursorY + 4.5)
            x += COLUMNS[index].width
        })
        doc.setDrawColor(...SLATE_200)
        doc.line(MARGIN, cursorY + rowHeight, PAGE_WIDTH - MARGIN, cursorY + rowHeight)
        cursorY += rowHeight
    }

    drawTableHeader()
    items.forEach((item) => drawItemRow(item))

    const totalPages = doc.getNumberOfPages()
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page)
        doc.setFillColor(...INDIGO)
        doc.rect(0, PAGE_HEIGHT - FOOTER_HEIGHT, PAGE_WIDTH, FOOTER_HEIGHT, 'F')
        doc.setTextColor(...WHITE)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.text(t('prescription.pdfConfidential'), MARGIN, PAGE_HEIGHT - 3)
        doc.text(
            `${t('prescription.page')} ${page} ${t('prescription.of')} ${totalPages}`,
            PAGE_WIDTH - MARGIN,
            PAGE_HEIGHT - 3,
            { align: 'right' },
        )
    }

    const shortId =
        String(prescription?._id || 'prescription').replace(/[^a-zA-Z0-9]/g, '').slice(-6) || 'prescription'
    doc.save(`prescripto-prescription-${shortId}.pdf`)
}
