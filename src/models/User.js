const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'owner', 'user'],
        default: 'user'
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    level: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    commissionEarned: {
        type: Number,
        default: 0
    },
    path: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate user path
userSchema.methods.generatePath = function () {
    if (!this.parentId) return this._id.toString();
    return `${this.parentId.path}.${this._id.toString()}`;
};

module.exports = mongoose.model('User', userSchema);