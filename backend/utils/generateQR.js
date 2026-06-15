import QRCode from 'qrcode'

async function generateQRCode(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 300,
    color: { dark: '#00193c', light: '#ffffff' }
  })
}

export default generateQRCode
