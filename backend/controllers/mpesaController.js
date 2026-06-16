import Order from '../models/Order.js'
import User from '../models/User.js'
import WalletTransaction from '../models/WalletTransaction.js'
import generateQRCode from '../utils/generateQR.js'
import { initiateSTKPush, initiateSandboxReversal } from '../services/mpesaService.js'

// POST /api/mpesa/pay-order
// Called by the frontend AFTER creating an order.
// Triggers the STK push to the customer's phone.
// Order must already exist in 'pending' state.

export async function orderSTKPush(req, res) {
  try {
    const { orderId, phone } = req.body

    if (!phone) return res.status(400).json({ error: 'Phone number is required' })

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Order already paid' })
    }

    const mpesa = await initiateSTKPush({
      phone,
      amount: order.totalAmt,
      accountRef: order.orderNumber,
      description: `SU Order ${order.orderNumber}`,
    })

    // Save the CheckoutRequestID so we can match it when the callback arrives
    order.mpesaCheckoutRequestId = mpesa.CheckoutRequestID
    await order.save()

    res.json({
      message:           'STK push sent. Check your phone for the M-Pesa PIN prompt.',
      checkoutRequestId: mpesa.CheckoutRequestID,
    })
  } catch (error) {
    console.error('Error in orderSTKPush:', error)
    res.status(500).json({ error: error.message || 'Failed to initiate M-Pesa payment' })
  }
}

//  POST /api/mpesa/topup 
// Wallet top-up via M-Pesa STK push.
// Creates a PENDING WalletTransaction; the callback credits the wallet on success.

export async function topUpSTKPush(req, res) {
  try {
    const userId = req.user.id
    const { amount, phone } = req.body

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' })
    }
    if (!phone) return res.status(400).json({ error: 'Phone number is required' })

    const numAmount = Number(amount)

    // Create a pending transaction first — we'll complete it in the callback
    const tx = await WalletTransaction.create({
      user:        userId,
      type:        'credit',
      amount:      numAmount,
      description: 'Wallet Top Up - M-Pesa',
      reference:   `PENDING-${Date.now()}`,
      status:      'pending',
    })

    const mpesa = await initiateSTKPush({
      phone,
      amount:      numAmount,
      accountRef:  'SU-WALLET',
      description: 'Wallet Top Up',
    })

    // Replace the temp reference with CheckoutRequestID for callback matching
    tx.reference = mpesa.CheckoutRequestID
    await tx.save()

    res.json({
      message:           'STK push sent. Check your phone for the M-Pesa PIN prompt.',
      checkoutRequestId: mpesa.CheckoutRequestID,
    })
  } catch (error) {
    console.error('Error in topUpSTKPush:', error)
    res.status(500).json({ error: error.message || 'Failed to initiate top-up' })
  }
}

//  POST /api/mpesa/callback 
// Safaricom calls this URL after the customer completes or cancels payment.
// NO authentication — Safaricom doesn't send our JWT.
// MUST always respond 200 quickly, otherwise Safaricom will retry.
//
// Safaricom callback body shape:
// {
//   Body: {
//     stkCallback: {
//       MerchantRequestID, CheckoutRequestID,
//       ResultCode,   // 0 = success, anything else = failure/cancel
//       ResultDesc,
//       CallbackMetadata: { Item: [{ Name, Value }, ...] }
//     }
//   }
// }

export async function mpesaCallback(req, res) {
  // Always ACK Safaricom first — long processing must not delay this response
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })

  try {
    console.log('INCOMING MPESA CALLBACK PAYLOAD')
    console.log(JSON.stringify(req.body, null, 2))

    const callback = req.body?.Body?.stkCallback
    if (!callback) return

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback
    const isSuccess = ResultCode === 0

    console.log(`Processing Callback: ID=${CheckoutRequestID} | ResultCode=${ResultCode} | Success=${isSuccess}`)

    if (isSuccess) {
      // Extract the receipt number from metadata items array
      const items = CallbackMetadata?.Item ?? []
      const find  = (name) => items.find((i) => i.Name === name)?.Value
      const mpesaReceiptNumber = find('MpesaReceiptNumber') ?? CheckoutRequestID

      console.log(`Mpesa Receipt Found: ${mpesaReceiptNumber}`)

      //  Case 1: Order payment 
      console.log(`Locating pending order with CheckoutRequestID: "${CheckoutRequestID}"...`)
      const order = await Order.findOne({ mpesaCheckoutRequestId: CheckoutRequestID })
      if (order && order.paymentStatus === 'pending') {
        console.log(`Order Found. Current Payment Status: ${order.paymentStatus}`)
        // Now that payment is confirmed, generate the QR code and activate the order
        const qrPayload = JSON.stringify({
          orderId:     order._id.toString(),
          orderNumber: order.orderNumber,
          userId:      order.user.toString(),
          timestamp:   new Date().toISOString(),
        })
        const qrDataUrl = await generateQRCode(qrPayload)

        order.paymentStatus         = 'paid'
        order.orderStatus           = 'received'
        order.mpesaReceiptNumber    = mpesaReceiptNumber
        order.qrCode                = qrDataUrl
        await order.save()
        console.log(`Order ${order.orderNumber} updated to PAID.`)

        await WalletTransaction.create({
          user:        order.user,
          type:        'debit',
          amount:      order.totalAmt,
          description: `Order Payment - #${order.orderNumber}`,
          reference:   mpesaReceiptNumber,
          status:      'completed',
        })

        // Refund trigger for orders
        console.log(`Order paid. Executing automated test reversal for receipt: ${mpesaReceiptNumber}`)
        await initiateSandboxReversal({ mpesaReceiptNumber, amount: order.totalAmt })
      }

      //  Case 2: Wallet top-up 
      const walletTx = await WalletTransaction.findOne({
        reference: CheckoutRequestID,
        status:    'pending',
      })
      if (walletTx) {
        await User.findByIdAndUpdate(walletTx.user, {
          $inc: { walletBalance: walletTx.amount },
        })
        walletTx.status    = 'completed'
        walletTx.reference = mpesaReceiptNumber
        await walletTx.save()

        // Refund trigger for wallet top-ups
        console.log(`Wallet topped up. Executing automated test reversal for receipt: ${mpesaReceiptNumber}`)
        await initiateSandboxReversal({ mpesaReceiptNumber, amount: walletTx.amount })
      }

    } else {
      // Payment cancelled or failed — mark records accordingly
      await Order.findOneAndUpdate(
        { mpesaCheckoutRequestId: CheckoutRequestID, paymentStatus: 'pending' },
        { paymentStatus: 'failed', orderStatus: 'cancelled' }
      )
      await WalletTransaction.findOneAndUpdate(
        { reference: CheckoutRequestID, status: 'pending' },
        { status: 'failed' }
      )
    }
  } catch (err) {
    // Log but don't re-throw — response already sent
    console.error('Error processing M-Pesa callback:', err)
  }
}
