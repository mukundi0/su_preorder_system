import mongoose from "mongoose"

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
    password: String
})

const User = mongoose.model("User", UserSchema)

export default User