const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    roles: {
        type: [String],
        default: ['user']
    },
    // New fields for password reset
    passwordResetToken: {
        type: String,
        select: false 
    },
    passwordResetExpires: {
        type: Date,
        select: false 
    }
}, { timestamps: true }); // Added timestamps for createdAt and updatedAt

const User = mongoose.model('User', userSchema);

module.exports = User;
