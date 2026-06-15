// Safaricom Daraja API base URL — swap env var to switch between sandbox / production
const BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

//  Helpers 

// Returns current time as YYYYMMDDHHmmss — Safaricom requires exactly this format
function getTimestamp() {
  return new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
}

// Password = base64(shortcode + passkey + timestamp)
// This proves to Safaricom that we own the shortcode
function buildPassword(timestamp) {
  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  return Buffer.from(raw).toString('base64')
}

// Normalize any phone format to 254XXXXXXXXX
// Handles: 07XXXXXXXX, +254XXXXXXXXX, 254XXXXXXXXX
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '') // strip non-digits
  if (digits.startsWith('0')) return `254${digits.slice(1)}`
  if (digits.startsWith('254')) return digits
  return digits
}

//  Step 1: Get OAuth access token 
// Safaricom uses client-credentials OAuth. We exchange Consumer Key + Secret
// for a short-lived (1 hour) access token that authorizes all other calls.

export async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const res = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`M-Pesa OAuth failed: ${text}`)
  }

  const data = await res.json()
  return data.access_token
}

//  Step 2: Initiate STK Push 
// Sends a payment prompt ("push") to the customer's phone.
// The customer sees a popup asking for their M-Pesa PIN.
// Safaricom then calls our CallbackURL with the result — we do NOT poll.
//
// Returns: { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription }
// CheckoutRequestID is the ID we'll use to match the callback later.

export async function initiateSTKPush({ phone, amount, accountRef, description }) {
  const token = await getAccessToken()
  const timestamp = getTimestamp()

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password:          buildPassword(timestamp),
    Timestamp:         timestamp,
    TransactionType:   'CustomerPayBillOnline', // use 'CustomerBuyGoodsOnline' for Till numbers
    Amount:            Math.ceil(amount),       // M-Pesa only accepts whole numbers (KES)
    PartyA:            normalizePhone(phone),   // customer phone
    PartyB:            process.env.MPESA_SHORTCODE,
    PhoneNumber:       normalizePhone(phone),
    CallBackURL:       process.env.MPESA_CALLBACK_URL,
    AccountReference:  accountRef,              // shows on customer's M-Pesa statement
    TransactionDesc:   description,
  }

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  // ResponseCode '0' means the push was dispatched (NOT that payment succeeded)
  if (data.ResponseCode !== '0') {
    throw new Error(data.ResponseDescription || 'STK push failed')
  }

  return data // caller needs data.CheckoutRequestID
}

//  Step 3 (optional): Query payment status 
// Lets you manually check if a push has been completed.
// Useful if the callback somehow missed or you want to verify before acting.

export async function querySTKPushStatus(checkoutRequestId) {
  const token = await getAccessToken()
  const timestamp = getTimestamp()

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password:          buildPassword(timestamp),
    Timestamp:         timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return res.json()
}

// Automated Sandbox Reversal
// So you never lose sandbox funds
export async function initiateSandboxReversal({ mpesaReceiptNumber, amount }) {
  const token = await getAccessToken()
  const timestamp = getTimestamp()

  const body = {
    Initiator: "testapi", // Global Sandbox Initiator Name
    SecurityCredential: "sandbox_security_credential", // Automatically matched by Daraja Sandbox
    CommandID: "TransactionReversal",
    TransactionID: mpesaReceiptNumber, // The receipt number from the successful callback
    Amount: Math.ceil(amount),
    ReceiverParty: process.env.MPESA_SHORTCODE, // Your sandbox shortcode (174379)
    ReceiverIdentifierType: "11", // Code meaning 'Business Paybill/Till Number'
    ResultURL: process.env.MPESA_CALLBACK_URL, // Can route results back to your existing webhook
    QueueTimeOutURL: process.env.MPESA_CALLBACK_URL,
    Remarks: "Automated Sandbox Testing Refund",
    Occasion: "TestCleanup",
  }

  const res = await fetch(`${BASE_URL}/mpesa/reversal/v1/request`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return res.json()
}