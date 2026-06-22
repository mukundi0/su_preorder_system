import User from '../models/User.js'
import { hashPassword, comparePassword } from '../helpers/auth.js'

export async function getAllUsers(req, res) {
    try {
        const { search = '', page = 1, limit = 20, role } = req.query
        const pageNum  = parseInt(page)
        const limitNum = parseInt(limit)
        const skip     = (pageNum - 1) * limitNum

        const query = {}
        if (search.trim()) {
            query.$or = [
                { name:      { $regex: search, $options: 'i' } },
                { email:     { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } },
            ]
        }
        if (role && role !== 'all') query.role = role

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password -verificationToken -verificationTokenExpires')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            User.countDocuments(query),
        ])

        res.json({
            users,
            pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
        })
    } catch (error) {
        console.error('Error in getAllUsers:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

export async function createUser(req, res) {
    try {
        const { name, email, password, role, studentId } = req.body

        if (!name?.trim() || !email?.trim() || !password || !role) {
            return res.status(400).json({ error: 'Name, email, password and role are required' })
        }

        const validRoles = ['student', 'kitchen_staff', 'admin']
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' })
        }

        const normalizedEmail = email.toLowerCase().trim()

        const existingEmail = await User.findOne({ email: normalizedEmail })
        if (existingEmail) return res.status(409).json({ error: 'Email already in use' })

        if (studentId?.trim()) {
            const existingId = await User.findOne({ studentId: studentId.trim() })
            if (existingId) return res.status(409).json({ error: 'Student/Staff ID already in use' })
        }

        const hashedPassword = await hashPassword(password)

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role,
            studentId: studentId?.trim() || undefined,
            isVerified: true,
        })

        const { password: _, verificationToken, verificationTokenExpires, ...userData } = user.toObject()
        res.status(201).json(userData)
    } catch (error) {
        console.error('Error in createUser:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

export async function updateUser(req, res) {
    try {
        const { id } = req.params
        const { name, role } = req.body

        const updateData = {}
        if (name !== undefined) updateData.name = name.trim()

        if (role !== undefined) {
            const validRoles = ['student', 'kitchen_staff', 'admin']
            if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' })
            if (id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role' })
            updateData.role = role
        }

        const user = await User.findByIdAndUpdate(id, updateData, { new: true })
            .select('-password -verificationToken -verificationTokenExpires')

        if (!user) return res.status(404).json({ error: 'User not found' })

        res.json(user)
    } catch (error) {
        console.error('Error in updateUser:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

export async function deleteUser(req, res) {
    try {
        const { id } = req.params

        if (id === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account' })
        }

        const user = await User.findByIdAndDelete(id)
        if (!user) return res.status(404).json({ error: 'User not found' })

        res.json({ message: 'User deleted successfully' })
    } catch (error) {
        console.error('Error in deleteUser:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

export async function updateProfile(req, res) {
    try {
        const userId = req.user.id
        const { name, currentPassword, newPassword } = req.body

        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ error: 'User not found' })

        const updateData = {}

        if (name !== undefined && name.trim()) {
            updateData.name = name.trim()
        }

        if (newPassword) {
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters' })
            }
            if (user.password) {
                if (!currentPassword) {
                    return res.status(400).json({ error: 'Current password is required' })
                }
                const match = await comparePassword(currentPassword, user.password)
                if (!match) {
                    return res.status(400).json({ error: 'Current password is incorrect' })
                }
            }
            updateData.password = await hashPassword(newPassword)
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No changes provided' })
        }

        const updated = await User.findByIdAndUpdate(userId, updateData, { new: true })
            .select('-password -verificationToken -verificationTokenExpires')

        res.json(updated)
    } catch (error) {
        console.error('Error in updateProfile:', error)
        res.status(500).json({ error: 'Server error' })
    }
}
