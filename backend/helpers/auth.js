import bcrypt from "bcryptjs"

// Hash password
export const hashPassword = (password) => {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(12, (err, salt) => {
            if (err) throw err

            bcrypt.hash(password, salt, (err, hash) => {
                if (err) {
                    reject(err)
                }

                resolve(hash)
            })
        })
    })
}

// Compare passwords during login
export const comparePassword = (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword)
}