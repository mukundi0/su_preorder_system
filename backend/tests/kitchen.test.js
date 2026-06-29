import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import app from '../app.js'
import User from '../models/User.js'
import MenuItem from '../models/MenuItem.js'
import Order from '../models/Order.js'
import Category from '../models/Category.js'

vi.mock('../utils/sendEmail.js', () => ({
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderReady: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../utils/generateQR.js', () => ({
    default: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createUser(data = {}) {
    const hashed = await bcrypt.hash(data.password || 'password123', 10)
    return User.create({
        name: data.name || 'Test User',
        email: data.email,
        password: hashed,
        role: data.role || 'student',
        isVerified: true,
        walletBalance: data.walletBalance ?? 0,
    })
}

function tokenFor(user) {
    return jwt.sign(
        { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
        process.env.SECRET_KEY,
        { expiresIn: '1h' }
    )
}

async function seedMenuItem() {
    const cat = await Category.create({ name: 'Kitchen Cat' })
    return MenuItem.create({
        name: 'Test Dish',
        category: cat._id,
        fullPrice: 100,
        imageUrl: 'http://example.com/test.jpg',
        isAvailable: true,
        prepTime: 5,
    })
}

async function seedOrder(user, menuItem, overrides = {}) {
    return Order.create({
        user: user._id,
        totalAmt: overrides.totalAmt ?? 100,
        items: [{ item: menuItem._id, qty: 1, servingSize: 'full' }],
        orderStatus: overrides.orderStatus ?? 'received',
        paymentMethod: overrides.paymentMethod ?? 'mpesa',
        paymentStatus: overrides.paymentStatus ?? 'paid',
        orderNumber: overrides.orderNumber ?? `STR-${Date.now()}`,
        ...overrides,
    })
}

// ── Route Access Control ──────────────────────────────────────────────────────

describe('Kitchen Staff: Route Protection', () => {
    it('returns 401 when updating status without authentication', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString()
        const res = await request(app)
            .patch(`/api/orders/${fakeId}/status`)
            .send({ orderStatus: 'preparing' })
        expect(res.status).toBe(401)
    })

    it('returns 401 when scanning QR without authentication', async () => {
        const res = await request(app)
            .post('/api/orders/verify-qr')
            .send({ orderId: new mongoose.Types.ObjectId().toString(), orderNumber: 'STR-FAKE' })
        expect(res.status).toBe(401)
    })

    it('returns 403 when a student tries to update order status', async () => {
        const student = await createUser({ email: 'guard-student@test.com', role: 'student' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(student, menuItem)
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Cookie', `token=${tokenFor(student)}`)
            .send({ orderStatus: 'preparing' })
        expect(res.status).toBe(403)
    })

    it('returns 403 when a student tries to verify QR', async () => {
        const student = await createUser({ email: 'guard-student2@test.com', role: 'student' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(student, menuItem, { orderStatus: 'ready for pickup', orderNumber: 'STR-GUARD' })
        const res = await request(app)
            .post('/api/orders/verify-qr')
            .set('Cookie', `token=${tokenFor(student)}`)
            .send({ orderId: order._id.toString(), orderNumber: 'STR-GUARD' })
        expect(res.status).toBe(403)
    })
})

// ── Update Order Status ───────────────────────────────────────────────────────

describe('Kitchen Staff: Update Order Status', () => {
    it('rejects an invalid status value', async () => {
        const staff = await createUser({ email: 'staff1@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem)
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderStatus: 'burned' })
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/invalid status/i)
    })

    it('returns 404 for a non-existent order', async () => {
        const staff = await createUser({ email: 'staff2@test.com', role: 'kitchen_staff' })
        const res = await request(app)
            .patch(`/api/orders/${new mongoose.Types.ObjectId()}/status`)
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderStatus: 'preparing' })
        expect(res.status).toBe(404)
    })

    it('advances status from received → preparing', async () => {
        const staff = await createUser({ email: 'staff3@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, { orderStatus: 'received' })
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderStatus: 'preparing' })
        expect(res.status).toBe(200)
        expect(res.body.orderStatus).toBe('preparing')
    })

    it('advances status from preparing → ready for pickup', async () => {
        const staff = await createUser({ email: 'staff4@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, { orderStatus: 'preparing' })
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderStatus: 'ready for pickup' })
        expect(res.status).toBe(200)
        expect(res.body.orderStatus).toBe('ready for pickup')
    })

    it('advances status from ready for pickup → collected', async () => {
        const staff = await createUser({ email: 'staff5@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, { orderStatus: 'ready for pickup' })
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderStatus: 'collected' })
        expect(res.status).toBe(200)
        expect(res.body.orderStatus).toBe('collected')
    })

    it('admin can also update order status', async () => {
        const admin = await createUser({ email: 'admin1@test.com', role: 'admin' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(admin, menuItem, { orderStatus: 'received' })
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Cookie', `token=${tokenFor(admin)}`)
            .send({ orderStatus: 'preparing' })
        expect(res.status).toBe(200)
        expect(res.body.orderStatus).toBe('preparing')
    })

    it('can cancel an order', async () => {
        const staff = await createUser({ email: 'staff6@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, { orderStatus: 'received' })
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderStatus: 'cancelled' })
        expect(res.status).toBe(200)
        expect(res.body.orderStatus).toBe('cancelled')
    })
})

// ── QR Verification ───────────────────────────────────────────────────────────

describe('Kitchen Staff: QR Verification', () => {
    it('returns 404 when the order does not exist', async () => {
        const staff = await createUser({ email: 'qr1@test.com', role: 'kitchen_staff' })
        const res = await request(app)
            .post('/api/orders/verify-qr')
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderId: new mongoose.Types.ObjectId().toString(), orderNumber: 'STR-FAKE' })
        expect(res.status).toBe(404)
    })

    it('returns 400 on orderNumber mismatch (tampered QR)', async () => {
        const staff = await createUser({ email: 'qr2@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, {
            orderStatus: 'ready for pickup',
            orderNumber: 'STR-REAL',
        })
        const res = await request(app)
            .post('/api/orders/verify-qr')
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderId: order._id.toString(), orderNumber: 'STR-FAKE' })
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/mismatch/i)
    })

    it('returns 400 when order was already collected', async () => {
        const staff = await createUser({ email: 'qr3@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, {
            orderStatus: 'collected',
            orderNumber: 'STR-DONE',
        })
        const res = await request(app)
            .post('/api/orders/verify-qr')
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderId: order._id.toString(), orderNumber: 'STR-DONE' })
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/already collected/i)
    })

    it('returns 400 when order is not yet ready for collection', async () => {
        const staff = await createUser({ email: 'qr4@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, {
            orderStatus: 'preparing',
            orderNumber: 'STR-PREP',
        })
        const res = await request(app)
            .post('/api/orders/verify-qr')
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderId: order._id.toString(), orderNumber: 'STR-PREP' })
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/not ready/i)
    })

    it('marks order as collected and sets collectedAt on valid QR scan', async () => {
        const staff = await createUser({ email: 'qr5@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, {
            orderStatus: 'ready for pickup',
            orderNumber: 'STR-VALID',
        })
        const res = await request(app)
            .post('/api/orders/verify-qr')
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderId: order._id.toString(), orderNumber: 'STR-VALID' })
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        const updated = await Order.findById(order._id)
        expect(updated.orderStatus).toBe('collected')
        expect(updated.collectedAt).toBeDefined()
    })

    it('accepts "ready" status (not just "ready for pickup")', async () => {
        const staff = await createUser({ email: 'qr6@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, {
            orderStatus: 'ready',
            orderNumber: 'STR-READY',
        })
        const res = await request(app)
            .post('/api/orders/verify-qr')
            .set('Cookie', `token=${tokenFor(staff)}`)
            .send({ orderId: order._id.toString(), orderNumber: 'STR-READY' })
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })
})

// ── View Orders ───────────────────────────────────────────────────────────────

describe('Kitchen Staff: View Orders', () => {
    it('can fetch all orders', async () => {
        const staff = await createUser({ email: 'view1@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        await seedOrder(staff, menuItem)
        await seedOrder(staff, menuItem, { orderNumber: 'STR-V002' })
        const res = await request(app).get('/api/orders')
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(2)
    })

    it('can fetch a specific order by ID with populated user and items', async () => {
        const staff = await createUser({ email: 'view2@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const order = await seedOrder(staff, menuItem, { orderNumber: 'STR-VIEW' })
        const res = await request(app).get(`/api/orders/${order._id}`)
        expect(res.status).toBe(200)
        expect(res.body._id).toBe(order._id.toString())
        expect(res.body.user).toHaveProperty('email', 'view2@test.com')
        expect(res.body.items[0].item).toHaveProperty('name', 'Test Dish')
    })

    it('returns 404 for a non-existent order', async () => {
        const res = await request(app).get(`/api/orders/${new mongoose.Types.ObjectId()}`)
        expect(res.status).toBe(404)
    })

    it('returns orders sorted newest first', async () => {
        const staff = await createUser({ email: 'view3@test.com', role: 'kitchen_staff' })
        const menuItem = await seedMenuItem()
        const first = await seedOrder(staff, menuItem, { orderNumber: 'STR-FIRST' })
        // small delay ensures distinct createdAt timestamps for the sort assertion
        await new Promise(r => setTimeout(r, 10))
        const second = await seedOrder(staff, menuItem, { orderNumber: 'STR-SECOND' })
        const res = await request(app).get('/api/orders')
        expect(res.status).toBe(200)
        expect(res.body.length).toBe(2)
        expect(res.body[0]._id).toBe(second._id.toString())
        expect(res.body[1]._id).toBe(first._id.toString())
    })
})
