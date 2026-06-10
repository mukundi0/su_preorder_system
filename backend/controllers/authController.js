import jwt from "jsonwebtoken"
import crypto from "crypto"

import User from "../models/User.js"
import { hashPassword, comparePassword } from '../helpers/auth.js'
import { sendVerificationEmail } from "../utils/sendEmail.js"
import { googleClient } from "../config/google.js"

// Function to register user
export async function registerUser(req, res) {
    try {
        const { name, email, password, role, studentId } = req.body

        if (!name || !email || !password || !role) {
            return res.json({
                error: "All fields are required"
            })
        }

        // Check if email is unique
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.json({ error: "Email already exists!" })
        }

        // Check if studentId is unique (if provided)
        if (studentId) {
            const existingId = await User.findOne({ studentId })
            if (existingId) {
                return res.json({ error: "Student/Staff ID already exists!" })
            }
        }

        // Check if role is valid
        const validRoles = ["student_staff", "kitchen_staff", "admin"];

        if (!validRoles.includes(role)) {
            return res.json({
                error: "Invalid role"
            });
        }

        // Check password validity
        if (password.length < 6) {
            return res.json({ error: "Password must be greater than 6 characters!" })
        }

        // Hash password
        const hashedPassword = await hashPassword(password)

        // Create user
        const user = await User.create({
            name, 
            email,
            studentId: studentId || undefined,
            role,
            password: hashedPassword,
            isVerified: false
        })

        // Generate verification token
        const verificationToken = user.getVerificationToken();

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/?token=${verificationToken}&email=${encodeURIComponent(user.email)}`

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
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: new Date() }
        })

        // Token invalid or expired
        if (!user) {
            return res.status(400).json({
                error: "Verification link is invalid or expired."
            })
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;

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
            return res.json({ error:  "User does not exist"})
        }

        // Verify user is verified
        if (!user.isVerified) {
            return res.json({ error: "You need to verify your email first!" })
        }

        // Verify user password
        const match = await comparePassword(password, user.password)
        if (!match) {
            return res.json({ error: "Password incorrect!" })
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


// Google Auth
export async function googleAuth(req, res) {
    try {
        const { credential } = req.body

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        })

        const payload = ticket.getPayload()

        const {
            sub: googleId,
            email,
            name, 
            email_verified,
            hd
        } = payload;

        if (!email_verified) {
            return res.json({
                error: "Email not verified by Google"
            })
        }

        // Ensure email is a .strathmore.edu email
        const domain = email.split("@")[1]?.toLowerCase()

        if (
            domain != 'strathmore.edu' ||
            payload.hd !== "strathmore.edu"
        ) {
            return res.json({
                error: "Please sign in with your institution email"
            })
        }

        // Find user
        let user = await User.findOne({ email })

        // If no user is found, create new user
        if (!user) {
            user = await User.create({
                name,
                email,
                role: "student_staff", // Admins & Kitchen staff will never get here
                isVerified: true
            })
        }

        // If user is found, but googleId is not, link Google account 
        // instead of creating duplicate user
        if (!user.googleId) {
            user.googleId = googleId;
            await user.save()
        }

        // JWT
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
        res.status(500).json({
            message: "Google Authentication failed"
        })
    }
}


// Resend verification email
export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ error: "Email is required." })
        }

        const normalizedEmail = String(email).trim().toLowerCase()

        const user = await User.findOne({
            email: normalizedEmail
        })

        if (!user) {
            return res.status(404).json({ error: "User not found." })
        }

        if (user.isVerified) {
            return res.status(400).json({ error: "Email is already verified." })
        }

        const newToken = user.getVerificationToken()
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/?token=${newToken}&email=${encodeURIComponent(user.email)}`
        const message = `Please verify your email by clicking the following link: ${verificationUrl}`

        await sendVerificationEmail({
            email: user.email,
            subject: 'Email Verification (Resend)',
            message,
        })

        await user.save({ validateBeforeSave: false })

        res.status(200).json({ success: true, message: "Verification email resent." })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}