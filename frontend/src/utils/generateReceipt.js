import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

async function loadImageBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function formatReceiptDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  const h = d.getHours()
  const h12 = h % 12 || 12
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${h12}:${pad(d.getMinutes())} ${ampm}`
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}

export async function generateReceipt(order, logoUrl) {
  const items = order.items || []
  const W = 90
  const lm = 5
  const pageH = Math.max(230, 178 + items.length * 10)

  const doc = new jsPDF({ unit: 'mm', format: [W, pageH], orientation: 'portrait' })

  let y = 5

  // ── LOGO ────────────────────────────────────────────────────────────────────
  try {
    const logoData = await loadImageBase64(logoUrl)
    const logoW = 22
    const logoH = 18
    doc.addImage(logoData, 'PNG', (W - logoW) / 2, y, logoW, logoH)
    y += logoH + 4
  } catch {
    y += 8
  }

  // ── UNIVERSITY HEADER ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 25, 60)
  doc.text('STRATHMORE UNIVERSITY', W / 2, y, { align: 'center' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(40, 40, 40)
  doc.text('Strathmore Cafeteria', W / 2, y, { align: 'center' }); y += 4.5
  doc.text('EMAIL: cafeteria@strathmore.edu', W / 2, y, { align: 'center' }); y += 4.5
  doc.text('TEL: 0703034249', W / 2, y, { align: 'center' }); y += 5.5

  // separator
  doc.setDrawColor(180, 180, 180)
  doc.line(lm, y, W - lm, y); y += 5

  // ── SALE RECEIPT ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0, 25, 60)
  doc.text('SALE RECEIPT', W / 2, y, { align: 'center' }); y += 6

  doc.setFontSize(9)
  const receiptNum = order.orderNumber || `ORD-${String(order._id).slice(-6).toUpperCase()}`
  doc.text(receiptNum, W / 2, y, { align: 'center' }); y += 5

  // separator
  doc.setDrawColor(180, 180, 180)
  doc.line(lm, y, W - lm, y); y += 5

  // ── META INFO ───────────────────────────────────────────────────────────────
  const metaRows = [
    ['Transaction Type', 'Normal'],
    ['Receipt Type', 'Sale'],
    ['DATE', formatReceiptDate(order.createdAt)],
  ]

  doc.setFontSize(7.5)
  metaRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    doc.text(label, lm, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20)
    doc.text(val, W - lm, y, { align: 'right' })
    y += 5.5
  })
  y += 1

  // ── ITEMS TABLE ─────────────────────────────────────────────────────────────
  const tableBody = items.map(entry => {
    const name = entry.item?.name || 'Item'
    const size = entry.servingSize ? ` (${capitalize(entry.servingSize)})` : ''
    const price = entry.servingSize === 'half'
      ? (entry.item?.halfPrice || 0)
      : (entry.item?.fullPrice || 0)
    const lineTotal = price * (entry.qty || 1)
    return [`${entry.qty} × ${name}${size}`, price.toFixed(2), lineTotal.toFixed(2)]
  })

  const totalQty = items.reduce((s, e) => s + (e.qty || 1), 0)

  autoTable(doc, {
    startY: y,
    head: [['ITEM', 'PRICE', 'TOTAL']],
    body: tableBody,
    foot: [[
      { content: `TOTAL: ${totalQty}`, styles: { fontStyle: 'bold', textColor: [0, 25, 60] } },
      '',
      { content: (order.totalAmt || 0).toFixed(2), styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 25, 60] } },
    ]],
    margin: { left: lm, right: lm },
    theme: 'plain',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 25, 60],
      fontStyle: 'bold',
      lineWidth: { bottom: 0.3 },
      lineColor: [180, 180, 180],
    },
    footStyles: {
      fillColor: [255, 255, 255],
      lineWidth: { top: 0.3 },
      lineColor: [180, 180, 180],
    },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 16, halign: 'right' },
      2: { cellWidth: 18, halign: 'right' },
    },
  })

  y = doc.lastAutoTable.finalY + 4

  // separator
  doc.setDrawColor(180, 180, 180)
  doc.line(lm, y, W - lm, y); y += 5

  // ── CUSTOMER ────────────────────────────────────────────────────────────────
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
  doc.text('Customer:', lm, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20)
  doc.text(order.user?.name || 'Guest', W - lm, y, { align: 'right' })
  y += 7

  // separator
  doc.setDrawColor(180, 180, 180)
  doc.line(lm, y, W - lm, y); y += 5

  // ── PAYMENTS ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(0, 25, 60)
  doc.text('Payments', W / 2, y, { align: 'center' }); y += 4

  doc.setDrawColor(180, 180, 180)
  doc.line(lm, y, W - lm, y); y += 5

  const payMode = order.paymentMethod === 'wallet' ? 'Wallet' : 'Mpesa'
  const payRef = order.orderNumber || '—'
  const payRows = [
    ['Mode:', payMode],
    ['Reference:', payRef],
    ['Paid:', `KES ${(order.totalAmt || 0).toLocaleString()}`],
  ]

  doc.setFontSize(7.5)
  payRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    doc.text(label, lm, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20)
    doc.text(val, W - lm, y, { align: 'right' })
    y += 5.5
  })

  // separator
  doc.setDrawColor(180, 180, 180)
  doc.line(lm, y, W - lm, y); y += 5

  // ── TOTAL PAID ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(0, 25, 60)
  doc.text('Total Paid', lm, y)
  doc.text(`KES ${(order.totalAmt || 0).toLocaleString()}`, W - lm, y, { align: 'right' })
  y += 7

  // separator
  doc.setDrawColor(180, 180, 180)
  doc.line(lm, y, W - lm, y); y += 5

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(80, 80, 80)
  doc.text(`Served By: ${order.pickupCounter || 'Counter 1'}`, lm, y); y += 5
  doc.text('Thanks for dining with us.', W / 2, y, { align: 'center' }); y += 5
  doc.text('© 2026 Strathmore University', W / 2, y, { align: 'center' })

  // ── PRINTED WATERMARK (drawn last so it overlays everything) ────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(34)
  doc.setTextColor(219, 80, 80)
  doc.text('PRINTED', W / 2, pageH * 0.4, { align: 'center', angle: 45 })

  doc.save(`receipt-${receiptNum}.pdf`)
}
