import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface PDFProgress {
  page: number
  total: number
}

export interface PDFOptions {
  onProgress?: (progress: PDFProgress) => void
}

/**
 * Captures every .stratum-page element inside the given container and
 * assembles them into a downloadable PDF.  Each page declares its own
 * orientation via data-orientation="portrait|landscape".
 */
export async function generateStratumPDF(
  containerId: string,
  filename: string,
  opts?: PDFOptions,
): Promise<void> {
  const container = document.getElementById(containerId)
  if (!container) throw new Error(`Container #${containerId} not found`)

  // Wait for webfonts so text renders correctly
  await document.fonts.ready

  const pages = Array.from(container.querySelectorAll<HTMLElement>('.stratum-page'))
  if (pages.length === 0) throw new Error('No .stratum-page elements found in container')

  const total = pages.length
  let pdf: jsPDF | null = null

  for (let i = 0; i < total; i++) {
    const page = pages[i]
    const orientation = (page.dataset.orientation ?? 'portrait') as 'portrait' | 'landscape'

    opts?.onProgress?.({ page: i + 1, total })

    // Capture the page element at 2× for crisp 192dpi equivalent quality
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      width: page.offsetWidth,
      height: page.offsetHeight,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.93)

    // A4 in mm: portrait = 210×297, landscape = 297×210
    const pdfW = orientation === 'landscape' ? 297 : 210
    const pdfH = orientation === 'landscape' ? 210 : 297

    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
    } else {
      pdf.addPage('a4', orientation)
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
  }

  if (pdf) {
    pdf.save(filename)
  }
}
