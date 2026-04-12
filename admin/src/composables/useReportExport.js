import { ref } from 'vue'

export function useReportExport() {
    const exporting = ref(false)

    function fmt(value, currency = '$') {
        if (value == null || value === 0) return '—'
        return `${currency}${Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`
    }

    function num(value) {
        return value == null || value === 0 ? '—' : String(value)
    }

    function nowLabel() {
        return new Date().toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        })
    }

    async function exportPDF({ rows = [], totals = {}, trend = [], year, title = 'Annual Report', currency = '$', doctor = null }) {
        exporting.value = true
        try {
            const { default: jsPDF } = await import('jspdf')
            const { default: autoTable } = await import('jspdf-autotable')

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

            const INDIGO     = [99, 102, 241]   // indigo-500  #6366f1
            const INDIGO_LIGHT = [224, 231, 255] // indigo-100  #e0e7ff
            const SLATE_700  = [51, 65, 85]
            const SLATE_500  = [100, 116, 139]
            const WHITE      = [255, 255, 255]
            const GREEN      = [22, 163, 74]
            const RED        = [220, 38, 38]

            const PAGE_W = doc.internal.pageSize.getWidth()
            const PAGE_H = doc.internal.pageSize.getHeight()
            let cursorY = 0

            doc.setFillColor(...INDIGO)
            doc.rect(0, 0, PAGE_W, 22, 'F')

            doc.setTextColor(...WHITE)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(16)
            doc.text('PRESCRIPTO', 14, 13)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            const subtitle = doctor ? `${title} — ${doctor}` : title
            doc.text(subtitle, 14, 19)

            doc.setFontSize(9)
            doc.text(`${year}  ·  Generated ${nowLabel()}`, PAGE_W - 14, 13, { align: 'right' })

            cursorY = 30

            const kpis = [
                { label: 'Total Appointments', value: num(totals.totalAppointments) },
                { label: 'Completed',           value: num(totals.completedAppointments), color: GREEN },
                { label: 'Cancelled',            value: num(totals.cancelledAppointments), color: RED },
                { label: 'Total Earnings',       value: fmt(totals.totalEarnings, currency), color: INDIGO },
            ]

            const cardW = (PAGE_W - 28 - 9) / 4
            kpis.forEach((kpi, i) => {
                const x = 14 + i * (cardW + 3)
                doc.setFillColor(...INDIGO_LIGHT)
                doc.roundedRect(x, cursorY, cardW, 18, 2, 2, 'F')
                doc.setTextColor(...SLATE_500)
                doc.setFontSize(7)
                doc.setFont('helvetica', 'normal')
                doc.text(kpi.label.toUpperCase(), x + 4, cursorY + 6)
                doc.setTextColor(...(kpi.color ?? SLATE_700))
                doc.setFontSize(12)
                doc.setFont('helvetica', 'bold')
                doc.text(kpi.value, x + 4, cursorY + 14)
            })

            cursorY += 26

            doc.setTextColor(...SLATE_700)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('Monthly Breakdown', 14, cursorY)
            cursorY += 4

            const tableRows = rows.map(r => [
                r.monthLabel,
                num(r.totalAppointments),
                num(r.completedAppointments),
                num(r.cancelledAppointments),
                fmt(r.earnings, currency),
                num(r.uniquePatients),
                fmt(r.cumulativeEarnings, currency),
            ])

            autoTable(doc, {
                startY: cursorY,
                head: [[
                    'Month', 'Appts', 'Done', 'Cancelled',
                    'Earnings', 'Patients', 'Cumul. Earnings',
                ]],
                body: tableRows,
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
                    textColor: SLATE_700,
                    lineColor: [226, 232, 240],
                    lineWidth: 0.2,
                },
                headStyles: {
                    fillColor: INDIGO,
                    textColor: WHITE,
                    fontStyle: 'bold',
                    fontSize: 7.5,
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    4: { halign: 'right' },
                    6: { halign: 'right', textColor: INDIGO },
                },
                margin: { left: 14, right: 14 },
            })

            cursorY = doc.lastAutoTable.finalY + 10

            if (trend && trend.length > 0) {
                const remainingSpace = PAGE_H - cursorY - 20
                const trendTableH = 10 + trend.length * 7

                if (remainingSpace < trendTableH) {
                    doc.addPage()
                    cursorY = 20
                }

                doc.setTextColor(...SLATE_700)
                doc.setFontSize(10)
                doc.setFont('helvetica', 'bold')
                doc.text('Monthly Trend', 14, cursorY)
                cursorY += 4

                const trendRows = trend.map(p => [
                    p.label,
                    num(p.appointments),
                    fmt(p.earnings, currency),
                    `${p.completionRate ?? 0}%`,
                ])

                autoTable(doc, {
                    startY: cursorY,
                    head: [['Period', 'Appointments', 'Earnings', 'Completion Rate']],
                    body: trendRows,
                    styles: {
                        fontSize: 8,
                        cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
                        textColor: SLATE_700,
                        lineColor: [226, 232, 240],
                        lineWidth: 0.2,
                    },
                    headStyles: {
                        fillColor: INDIGO,
                        textColor: WHITE,
                        fontStyle: 'bold',
                        fontSize: 7.5,
                    },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                        2: { halign: 'right' },
                        3: { halign: 'right' },
                    },
                    margin: { left: 14, right: 14 },
                    tableWidth: 160,
                })
            }

            const totalPages = doc.internal.getNumberOfPages()
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p)
                doc.setFillColor(...INDIGO)
                doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F')
                doc.setTextColor(...WHITE)
                doc.setFontSize(7)
                doc.setFont('helvetica', 'normal')
                doc.text('Prescripto — Confidential', 14, PAGE_H - 3)
                doc.text(`Page ${p} of ${totalPages}`, PAGE_W - 14, PAGE_H - 3, { align: 'right' })
            }

            const safeName = doctor
                ? `${doctor.replace(/\s+/g, '_')}_report_${year}`
                : `prescripto_report_${year}`
            doc.save(`${safeName}.pdf`)
        } finally {
            exporting.value = false
        }
    }

    async function exportExcel({ rows = [], totals = {}, trend = [], year, title = 'Annual Report', currency = '$', doctor = null }) {
        exporting.value = true
        try {
            const XLSX = await import('xlsx')

            const wb = XLSX.utils.book_new()

            const summaryData = [
                ['PRESCRIPTO — ' + (doctor ? `${title} (${doctor})` : title)],
                [`Year: ${year}`, '', `Generated: ${nowLabel()}`],
                [],
                ['KPI', 'Value'],
                ['Total Appointments', totals.totalAppointments ?? 0],
                ['Completed Appointments', totals.completedAppointments ?? 0],
                ['Cancelled Appointments', totals.cancelledAppointments ?? 0],
                ['Total Earnings', totals.totalEarnings ?? 0],
            ]

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
            summarySheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 30 }]

            const earningsCell = summarySheet['B8']
            if (earningsCell) {
                earningsCell.t = 'n'
                earningsCell.z = `"${currency}"#,##0.00`
            }

            XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

            const breakdownHeader = [
                'Month', 'Total Appointments', 'Completed', 'Cancelled',
                `Earnings (${currency})`, 'Unique Patients', `Cumulative Earnings (${currency})`,
            ]

            const breakdownRows = rows.map(r => [
                r.monthLabel,
                r.totalAppointments ?? 0,
                r.completedAppointments ?? 0,
                r.cancelledAppointments ?? 0,
                r.earnings ?? 0,
                r.uniquePatients ?? 0,
                r.cumulativeEarnings ?? 0,
            ])

            const totalsRow = [
                'TOTAL',
                `=SUM(B2:B13)`,
                `=SUM(C2:C13)`,
                `=SUM(D2:D13)`,
                `=SUM(E2:E13)`,
                `=MAX(F2:F13)`,
                rows.length > 0 ? (rows[rows.length - 1].cumulativeEarnings ?? 0) : 0,
            ]

            const breakdownSheet = XLSX.utils.aoa_to_sheet([
                breakdownHeader,
                ...breakdownRows,
                totalsRow,
            ])

            breakdownSheet['!cols'] = [
                { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
                { wch: 18 }, { wch: 16 }, { wch: 22 },
            ]

            const range = XLSX.utils.decode_range(breakdownSheet['!ref'] ?? 'A1')
            for (let row = 1; row <= range.e.r; row++) {
                ;['E', 'G'].forEach(col => {
                    const addr = `${col}${row + 1}`
                    const cell = breakdownSheet[addr]
                    if (cell && cell.t === 'n') {
                        cell.z = `"${currency}"#,##0.00`
                    }
                })
            }

            XLSX.utils.book_append_sheet(wb, breakdownSheet, 'Monthly Breakdown')

            if (trend && trend.length > 0) {
                const trendHeader = ['Period', 'Appointments', `Earnings (${currency})`, 'Completion Rate (%)']
                const trendRows = trend.map(p => [
                    p.label,
                    p.appointments ?? 0,
                    p.earnings ?? 0,
                    p.completionRate ?? 0,
                ])

                const trendSheet = XLSX.utils.aoa_to_sheet([trendHeader, ...trendRows])
                trendSheet['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 20 }]

                const tRange = XLSX.utils.decode_range(trendSheet['!ref'] ?? 'A1')
                for (let row = 1; row <= tRange.e.r; row++) {
                    const addr = `C${row + 1}`
                    const cell = trendSheet[addr]
                    if (cell && cell.t === 'n') {
                        cell.z = `"${currency}"#,##0.00`
                    }
                }

                XLSX.utils.book_append_sheet(wb, trendSheet, 'Trend')
            }

            const safeName = doctor
                ? `${doctor.replace(/\s+/g, '_')}_report_${year}`
                : `prescripto_report_${year}`

            XLSX.writeFile(wb, `${safeName}.xlsx`)
        } finally {
            exporting.value = false
        }
    }
    return { exportPDF, exportExcel, exporting }
}