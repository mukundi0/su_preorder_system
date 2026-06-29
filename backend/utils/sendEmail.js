import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

export const sendVerificationEmail = async (options) => {
    await transporter.sendMail({
        from: `SuPreorder System <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    })
}

export const sendOrderConfirmation = async ({ to, name, orderNumber, items = [], totalAmt }) => {
    const firstName = name?.split(' ')[0] || 'there'
    const itemRows = items.map(i =>
        `<tr>
            <td style="padding:6px 0;color:#374151;">${i.qty}× ${i.item?.name || 'Item'}</td>
            <td style="padding:6px 0;color:#6b7280;text-align:right;text-transform:capitalize;">${i.servingSize}</td>
        </tr>`
    ).join('')

    await transporter.sendMail({
        from: `Strathmore Dining <${process.env.EMAIL_USER}>`,
        to,
        subject: `Order ${orderNumber} is being prepared 🍽️`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#003366;padding:28px 32px;">
                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Strathmore Dining</h1>
                <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Order Confirmation</p>
            </div>
            <div style="padding:28px 32px;">
                <p style="color:#111827;font-size:16px;margin:0 0 16px;">Hi ${firstName},</p>
                <p style="color:#374151;font-size:14px;margin:0 0 20px;">
                    Your order has been received and the kitchen is now preparing it. We'll email you again as soon as it's ready for collection.
                </p>
                <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin-bottom:20px;border:1px solid #e5e7eb;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Order #${orderNumber}</p>
                    <table style="width:100%;border-collapse:collapse;">
                        ${itemRows}
                        <tr>
                            <td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:10px;margin-top:8px;"></td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;font-weight:700;color:#111827;">Total</td>
                            <td style="padding:4px 0;font-weight:700;color:#003366;text-align:right;">KES ${Number(totalAmt).toLocaleString('en-KE')}</td>
                        </tr>
                    </table>
                </div>
                <p style="color:#6b7280;font-size:13px;margin:0;">Please wait for a "Ready for Collection" email before heading to the counter.</p>
            </div>
            <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
                <p style="color:#9ca3af;font-size:12px;margin:0;">Strathmore University Cafeteria &mdash; Pre-Order System</p>
            </div>
        </div>`
    })
}

export const sendIssueAlert = async ({ adminEmails, reporterName, reporterEmail, reporterRole, orderNumber, category, description }) => {
    const roleLabel = { admin: 'Admin', kitchen_staff: 'Kitchen Staff', student: 'Student' }[reporterRole] || reporterRole
    const categoryLabel = {
        wrong_order:  'Wrong Order',
        missing_item: 'Missing Item',
        food_quality: 'Food Quality',
        payment:      'Payment Issue',
        other:        'Other',
    }[category] || category

    await transporter.sendMail({
        from: `Strathmore Dining <${process.env.EMAIL_USER}>`,
        to: adminEmails.join(', '),
        subject: `[Issue Reported] ${categoryLabel}${orderNumber ? ` — Order ${orderNumber}` : ''}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#7f1d1d;padding:28px 32px;">
                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Strathmore Dining</h1>
                <p style="color:#fca5a5;margin:4px 0 0;font-size:13px;">Issue Report</p>
            </div>
            <div style="padding:28px 32px;">
                <p style="color:#111827;font-size:15px;margin:0 0 20px;">A new issue has been reported and requires your attention.</p>
                <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:40%;">Reported by</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:600;">${reporterName} <span style="color:#6b7280;font-weight:400;">(${roleLabel})</span></td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Email</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;">${reporterEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Order</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#003366;font-size:13px;font-weight:700;">${orderNumber ? `#${orderNumber}` : 'General Report'}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:13px;">Category</td>
                        <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;">${categoryLabel}</td>
                    </tr>
                </table>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#991b1b;">Description</p>
                    <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${description}</p>
                </div>
            </div>
            <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
                <p style="color:#9ca3af;font-size:12px;margin:0;">Strathmore University Cafeteria &mdash; Pre-Order System</p>
            </div>
        </div>`
    })
}

export const sendOrderReady = async ({ to, name, orderNumber, pickupCounter }) => {
    const firstName = name?.split(' ')[0] || 'there'
    const counter = pickupCounter || 'Counter 1'

    await transporter.sendMail({
        from: `Strathmore Dining <${process.env.EMAIL_USER}>`,
        to,
        subject: `Your order #${orderNumber} is ready for collection! 🍽️`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;background:#ffffff;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#003366 0%,#00509e 100%);padding:36px 40px 28px;border-radius:12px 12px 0 0;">
                <p style="margin:0 0 4px;color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Strathmore Dining</p>
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2;">Your order is<br>ready! 🎉</h1>
            </div>

            <!-- Green status band -->
            <div style="background:#16a34a;padding:14px 40px;display:flex;align-items:center;">
                <span style="font-size:20px;margin-right:10px;">✅</span>
                <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:.03em;">ORDER READY FOR COLLECTION</span>
            </div>

            <!-- Body -->
            <div style="padding:36px 40px;background:#ffffff;">
                <p style="margin:0 0 20px;color:#111827;font-size:16px;line-height:1.6;">
                    Hi <strong>${firstName}</strong>,<br>
                    Great news — your order is freshly prepared and waiting at the counter.
                    Head over now before it gets cold! 🍽️
                </p>

                <!-- Order number pill -->
                <div style="display:inline-block;background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:10px 20px;margin-bottom:28px;">
                    <span style="font-size:12px;font-weight:700;color:#4338ca;letter-spacing:.08em;text-transform:uppercase;">Order Number</span><br>
                    <span style="font-size:22px;font-weight:800;color:#003366;">#${orderNumber}</span>
                </div>

                <!-- Pickup counter card -->
                <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:24px 28px;text-align:center;margin-bottom:28px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#15803d;">📍 Collect your order at</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:#003366;">${counter}</p>
                </div>

                <!-- Instruction row -->
                <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px;overflow:hidden;">
                    <tr>
                        <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;font-size:22px;width:48px;">📱</td>
                        <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px;">Show your <strong>QR code</strong> or quote your <strong>order number</strong> to the kitchen staff.</td>
                    </tr>
                    <tr>
                        <td style="padding:14px 20px;font-size:22px;">⏱️</td>
                        <td style="padding:14px 20px;color:#374151;font-size:13px;">Orders are held for <strong>30 minutes</strong>. Please collect as soon as possible.</td>
                    </tr>
                </table>
            </div>

            <!-- Footer -->
            <div style="background:#f3f4f6;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Strathmore University Cafeteria &mdash; Pre-Order System</p>
                <p style="margin:0;color:#9ca3af;font-size:11px;">This is an automated message. Please do not reply.</p>
            </div>

        </div>`
    })
}
