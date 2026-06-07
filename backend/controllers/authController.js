import jwt from "jsonwebtoken"
import crypto from "crypto"

import User from "../models/User.js"
import { hashPassword, comparePassword } from '../helpers/auth.js'
import { sendVerificationEmail } from "../utils/sendEmail.js"

// Function to register user
export async function registerUser(req, res) {
    try {
        const { name, email, password, role } = req.body

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                error: "All fields are required"
            })
        }

        // Check if email is unique
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(409).json({ error: "Email already exists!" })
        }

        // Check if role is valid
        const validRoles = ["student_staff", "kitchen_staff", "admin"];

        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        // Check password validity
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be greater than 6 characters!" })
        }

        // Hash password
        const hashedPassword = await hashPassword(password)

        // Create user
        const user = await User.create({
            name, 
            email,
            role,
            password: hashedPassword,
            isVerified: false
        })

        // Generate verification token
        const verificationToken = user.getVerificationToken();

        // Send verification email
        // http://localhost:5173/verify-email/>token=1bc123
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/?token=${verificationToken}`

        // Email message
        const message = `Please verify your email by clicking the following link: ${verificationUrl}`;

        await sendVerificationEmail({
            email: user.email,
            subject: 'Email Verification',
            message,
        })

        console.log("Email verification sent successfully!")

        await user.save({ validateBeforeSave: false })

        const { password: _, ...userData } = user.toObject()
        return res.json(userData)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}


// Verify email
export const verifyEmail = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

        const user = await User.findOne({
            verificationToken: hashedToken
        })

        // Token invalid/already used
        if (!user) {
            return res.status(400).json({
                error: "Verification link is invalid or expired."
            })
        }

        user.isVerified = true;
        user.verificationToken = undefined;

        await user.save();

        res.status(200).json({ success: true, message: "Email verified successfully" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}


// Function to login user
export async function loginUser(req, res) {
    try {
        const { email, password } = req.body

        // Find user
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ error:  "User does not exist"})
        }

        // Verify user password
        const match = await comparePassword(password, user.password)
        if (!match) {
            return res.status(401).json({ error: "Password incorrect!" })
        }

        jwt.sign(
            { 
                id: user._id, 
                email: user.email, 
                name: user.name, 
                role: user.role,
            }, process.env.SECRET_KEY, {}, (err, token) => {
                if (err) throw err

                const { password: _, ...userData } = user.toObject()

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production"
                }).json(userData)
            }
        )

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}


// Logout user
export async function logoutUser(req, res) {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }).json({ message: "Logged out successfully!" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}


// Get currently logged in user
export async function getUser(req, res) {
    try {
        
        const { token } = req.cookies

        if (!token) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        jwt.verify(token, process.env.SECRET_KEY, {}, async (err, data) => {
            if (err) {
                return res.status(401).json({ error: "Token verification failed" })
            }

            const user = await User.findById(data.id).select("-password")

            res.json(user)
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}