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

//  Helpers 

async function createUser(data = {}) {
    const hashed = await bcrypt.hash(data.password || 'password123', 10)
    return User.create({
        name: data.name || 'Test Student',
        email: data.email || 'student@test.com',
        password: hashed,
        role: data.role || 'student',
        isVerified: data.isVerified ?? true,
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

async function createMenuItem(overrides = {}) {
    const cat = await Category.create({ name: 'Test Category' })
    return MenuItem.create({
        name: overrides.name || 'Ugali',
        category: cat._id,
        fullPrice: overrides.fullPrice ?? 100,
        halfPrice: overrides.halfPrice ?? 50,
        imageUrl: 'http://example.com/test.jpg',
        isAvailable: true,
        prepTime: overrides.prepTime ?? 10,
    })
}

// ── Registration ──────────────────────────────────────────────────────────────

describe('Student: Registration', () => {
    it('rejects when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'a@test.com' })
        expect(res.body.error).toBeTruthy()
    })

    it('rejects an invalid role', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test', email: 'a@test.com', password: 'pass123', role: 'superuser' })
        expect(res.body.error).toMatch(/invalid role/i)
    })

    it('rejects a password shorter than 6 characters', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test', email: 'a@test.com', password: '123', role: 'student' })
        expect(res.body.error).toBeTruthy()
    })

    it('rejects a duplicate email', async () => {
        await createUser({ email: 'dup@test.com' })
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Another', email: 'dup@test.com', password: 'pass123', role: 'student' })
        expect(res.body.error).toMatch(/email already exists/i)
    })

    it('registers successfully and does not return the password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'New Student', email: 'new@test.com', password: 'password123', role: 'student' })
        expect(res.body.email).toBe('new@test.com')
        expect(res.body.role).toBe('student')
        expect(res.body.password).toBeUndefined()
        expect(res.body.isVerified).toBe(false)
    })

    it('can register kitchen_staff role', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Chef', email: 'chef@test.com', password: 'password123', role: 'kitchen_staff' })
        expect(res.body.role).toBe('kitchen_staff')
        expect(res.body.password).toBeUndefined()
    })
})

// ── Login ─────────────────────────────────────────────────────────────────────

describe('Student: Login', () => {
    it('rejects a non-existent email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ghost@test.com', password: 'pass123' })
        expect(res.body.error).toMatch(/user does not exist/i)
    })

    it('rejects an unverified user', async () => {
        await createUser({ email: 'unverified@test.com', isVerified: false })
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'unverified@test.com', password: 'password123' })
        expect(res.body.error).toMatch(/verify your email/i)
    })

    it('rejects a wrong password', async () => {
        await createUser({ email: 'wrong@test.com', isVerified: true })
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'wrong@test.com', password: 'wrongpass' })
        expect(res.body.error).toMatch(/password incorrect/i)
    })

    it('logs in a verified user, returns user data, and sets auth cookie', async () => {
        await createUser({ email: 'login@test.com', password: 'pass123', isVerified: true })
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'login@test.com', password: 'pass123' })
        expect(res.body.email).toBe('login@test.com')
        expect(res.body.password).toBeUndefined()
        expect(res.headers['set-cookie']).toBeDefined()
    })
})

// ── Browse Menu ───────────────────────────────────────────────────────────────

describe('Student: Browse Menu', () => {
    it('returns an empty array when no items exist', async () => {
        const res = await request(app).get('/api/menuitems')
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    it('returns menu items with category populated', async () => {
        await createMenuItem({ name: 'Chapati' })
        const res = await request(app).get('/api/menuitems')
        expect(res.body.length).toBe(1)
        expect(res.body[0].name).toBe('Chapati')
        expect(res.body[0].category).toBeDefined()
    })

    it('filters by search query', async () => {
        await createMenuItem({ name: 'Rice' })
        await createMenuItem({ name: 'Beans' })
        const res = await request(app).get('/api/menuitems?search=rice')
        expect(res.body.length).toBe(1)
        expect(res.body[0].name).toBe('Rice')
    })
})

// ── Place Order ───────────────────────────────────────────────────────────────

describe('Student: Place Order', () => {
    it('rejects an empty cart', async () => {
        const student = await createUser({ email: 's1@test.com' })
        const res = await request(app)
            .post('/api/orders/create')
            .send({ userId: student._id.toString(), items: [], paymentMethod: 'mpesa' })
        expect(res.body.error).toMatch(/cart is empty/i)
    })

    it('rejects an unknown user', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString()
        const menuItem = await createMenuItem()
        const res = await request(app)
            .post('/api/orders/create')
            .send({
                userId: fakeId,
                items: [{ item: menuItem._id.toString(), qty: 1, servingSize: 'full' }],
                paymentMethod: 'mpesa',
            })
        expect(res.body.error).toMatch(/user does not exist/i)
    })

    it('rejects when wallet balance is insufficient', async () => {
        const student = await createUser({ email: 's2@test.com', walletBalance: 50 })
        const menuItem = await createMenuItem({ fullPrice: 200 })
        const res = await request(app)
            .post('/api/orders/create')
            .send({
                userId: student._id.toString(),
                items: [{ item: menuItem._id.toString(), qty: 1, servingSize: 'full' }],
                paymentMethod: 'wallet',
            })
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/insufficient wallet balance/i)
    })

    it('creates a wallet order, deducts balance, and generates a QR code', async () => {
        const student = await createUser({ email: 's3@test.com', walletBalance: 500 })
        const menuItem = await createMenuItem({ fullPrice: 150, prepTime: 10 })
        const res = await request(app)
            .post('/api/orders/create')
            .send({
                userId: student._id.toString(),
                items: [{ item: menuItem._id.toString(), qty: 1, servingSize: 'full' }],
                paymentMethod: 'wallet',
            })
        expect(res.status).toBe(201)
        expect(res.body.paymentMethod).toBe('wallet')
        expect(res.body.paymentStatus).toBe('paid')
        expect(res.body.qrCode).toBeDefined()

        const updated = await User.findById(student._id)
        expect(updated.walletBalance).toBe(350)
    })

    it('creates an M-Pesa order in pending state', async () => {
        const student = await createUser({ email: 's4@test.com' })
        const menuItem = await createMenuItem({ fullPrice: 100 })
        const res = await request(app)
            .post('/api/orders/create')
            .send({
                userId: student._id.toString(),
                items: [{ item: menuItem._id.toString(), qty: 1, servingSize: 'full' }],
                paymentMethod: 'mpesa',
            })
        expect(res.status).toBe(201)
        expect(res.body.paymentStatus).toBe('pending')
        expect(res.body.orderStatus).toBe('pending')
        expect(res.body.qrCode).toBeUndefined()
    })

    it('calculates half-price and quantity correctly', async () => {
        const student = await createUser({ email: 's5@test.com', walletBalance: 1000 })
        const menuItem = await createMenuItem({ fullPrice: 100, halfPrice: 50 })
        const res = await request(app)
            .post('/api/orders/create')
            .send({
                userId: student._id.toString(),
                items: [{ item: menuItem._id.toString(), qty: 2, servingSize: 'half' }],
                paymentMethod: 'wallet',
            })
        expect(res.status).toBe(201)
        expect(res.body.totalAmt).toBe(100) // 2 × 50
    })

    it('sets status to "ready for pickup" immediately when prepTime is 0', async () => {
        const student = await createUser({ email: 's6@test.com', walletBalance: 500 })
        const menuItem = await createMenuItem({ fullPrice: 100, prepTime: 0 })
        const res = await request(app)
            .post('/api/orders/create')
            .send({
                userId: student._id.toString(),
                items: [{ item: menuItem._id.toString(), qty: 1, servingSize: 'full' }],
                paymentMethod: 'wallet',
            })
        expect(res.status).toBe(201)
        expect(res.body.orderStatus).toBe('ready for pickup')
    })
})

// ── Cancel Order ──────────────────────────────────────────────────────────────

describe('Student: Cancel Order', () => {
    it('requires authentication', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString()
        const res = await request(app).post(`/api/orders/${fakeId}/cancel`)
        expect(res.status).toBe(401)
    })

    it('student can cancel their own pending order', async () => {
        const student = await createUser({ email: 'cancel1@test.com' })
        const menuItem = await createMenuItem()
        const order = await Order.create({
            user: student._id,
            totalAmt: 100,
            items: [{ item: menuItem._id, qty: 1, servingSize: 'full' }],
            orderStatus: 'pending',
            paymentMethod: 'mpesa',
            paymentStatus: 'pending',
            orderNumber: 'STR-C001',
        })
        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${tokenFor(student)}`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        const updated = await Order.findById(order._id)
        expect(updated.orderStatus).toBe('cancelled')
    })

    it('student cannot cancel another student\'s order (403)', async () => {
        const owner = await createUser({ email: 'owner@test.com' })
        const other = await createUser({ email: 'other@test.com' })
        const menuItem = await createMenuItem()
        const order = await Order.create({
            user: owner._id,
            totalAmt: 100,
            items: [{ item: menuItem._id, qty: 1, servingSize: 'full' }],
            orderStatus: 'pending',
            paymentMethod: 'mpesa',
            paymentStatus: 'pending',
            orderNumber: 'STR-C002',
        })
        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${tokenFor(other)}`)
        expect(res.status).toBe(403)
    })

    it('cannot cancel an already-collected order', async () => {
        const student = await createUser({ email: 'collected@test.com' })
        const menuItem = await createMenuItem()
        const order = await Order.create({
            user: student._id,
            totalAmt: 100,
            items: [{ item: menuItem._id, qty: 1, servingSize: 'full' }],
            orderStatus: 'collected',
            paymentMethod: 'mpesa',
            paymentStatus: 'paid',
            orderNumber: 'STR-C003',
        })
        const res = await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${tokenFor(student)}`)
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/cannot be cancelled/i)
    })

    it('refunds wallet balance when a wallet-paid order is cancelled', async () => {
        const student = await createUser({ email: 'refund@test.com', walletBalance: 200 })
        const menuItem = await createMenuItem()
        const order = await Order.create({
            user: student._id,
            totalAmt: 100,
            items: [{ item: menuItem._id, qty: 1, servingSize: 'full' }],
            orderStatus: 'pending',
            paymentMethod: 'wallet',
            paymentStatus: 'paid',
            orderNumber: 'STR-C004',
        })
        await request(app)
            .post(`/api/orders/${order._id}/cancel`)
            .set('Cookie', `token=${tokenFor(student)}`)
        const updated = await User.findById(student._id)
        expect(updated.walletBalance).toBe(300) // 200 + 100 refund
    })
})

// ── Order Tracking ────────────────────────────────────────────────────────────

describe('Student: View Order by ID', () => {
    it('returns the order details', async () => {
        const student = await createUser({ email: 'track@test.com' })
        const menuItem = await createMenuItem()
        const order = await Order.create({
            user: student._id,
            totalAmt: 100,
            items: [{ item: menuItem._id, qty: 1, servingSize: 'full' }],
            orderStatus: 'preparing',
            paymentMethod: 'mpesa',
            paymentStatus: 'paid',
            orderNumber: 'STR-T001',
        })
        const res = await request(app).get(`/api/orders/${order._id}`)
        expect(res.status).toBe(200)
        expect(res.body._id).toBe(order._id.toString())
        expect(res.body.orderStatus).toBe('preparing')
    })

    it('returns 404 for a non-existent order', async () => {
        const res = await request(app).get(`/api/orders/${new mongoose.Types.ObjectId()}`)
        expect(res.status).toBe(404)
    })
})
