import mongoose from "mongoose"
import crypto from "node:crypto";

const UserSchema = mongoose.Schema({
    name: String,
    email: {
        type: String,
        unique: true,
        required: true
    },
    studentId: {
        type: String,
        unique: true,
        sparse: true
    },
    role: {
        type: String,
        enum: ["student_staff", "kitchen_staff", "admin"],
        default: "student_staff"
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    password: String,
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationToken: String,
}, { timestamps: true })


UserSchema.methods.getVerificationToken = function() {
    const token = crypto.randomBytes(20).toString("hex");

    this.verificationToken = crypto 
        .createHash('sha256')
        .update(token)
        .digest("hex")

    return token;
}

const User = mongoose.model("User", UserSchema)

export default User