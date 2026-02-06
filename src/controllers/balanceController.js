const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Helper function
const canCreditToUser = (sender, receiver) => {
    // Admin can credit to anyone
    if (sender.role === 'admin') return true;

    // Owner can credit to immediate downline
    if (sender.role === 'owner') {
        return receiver.parentId && receiver.parentId.toString() === sender._id.toString();
    }

    // Regular users can only credit to immediate downline
    return receiver.parentId && receiver.parentId.toString() === sender._id.toString();
};

const BalanceController = {
    creditBalance: async (req, res) => {
        try {
            const { receiverId, amount, commissionPercentage = 0 } = req.body;
            const sender = req.user;

            // Find receiver
            const receiver = await User.findById(receiverId);

            if (!receiver) {
                return res.status(404).json({
                    success: false,
                    message: 'Receiver not found'
                });
            }

            // Check if sender can credit to receiver
            if (!canCreditToUser(sender, receiver)) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to credit balance to this user'
                });
            }

            // Check sender balance
            if (sender.balance < amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient balance'
                });
            }

            // Calculate commission
            const commission = amount * (commissionPercentage / 100);
            const netAmount = amount - commission;

            try {
                // Update sender balance
                await User.findByIdAndUpdate(sender._id, {
                    $inc: { balance: -amount }
                });

                // Update receiver balance
                await User.findByIdAndUpdate(receiver._id, {
                    $inc: { balance: netAmount }
                });

                // Record transaction for sender (debit)
                await Transaction.create({
                    sender: sender._id,
                    receiver: receiver._id,
                    amount,
                    type: 'debit',
                    description: `Balance transfer to ${receiver.username}`,
                    balanceBefore: sender.balance,
                    balanceAfter: sender.balance - amount
                });

                // Record transaction for receiver (credit)
                await Transaction.create({
                    sender: sender._id,
                    receiver: receiver._id,
                    amount: netAmount,
                    type: 'credit',
                    description: `Balance received from ${sender.username}`,
                    balanceBefore: receiver.balance,
                    balanceAfter: receiver.balance + netAmount,
                    commission: {
                        amount: commission,
                        percentage: commissionPercentage
                    }
                });

                // If commission > 0, credit to sender's parent if exists
                if (commission > 0 && sender.parentId) {
                    await User.findByIdAndUpdate(sender.parentId, {
                        $inc: {
                            balance: commission,
                            commissionEarned: commission
                        }
                    });

                    await Transaction.create({
                        sender: sender._id,
                        receiver: sender.parentId,
                        amount: commission,
                        type: 'commission',
                        description: `Commission from transfer to ${receiver.username}`,
                        balanceBefore: sender.parentId.balance,
                        balanceAfter: sender.parentId.balance + commission
                    });
                }

                // Emit real-time update
                req.io.emit('balanceUpdate', {
                    senderId: sender._id,
                    receiverId: receiver._id,
                    amount,
                    commission
                });

                res.json({
                    success: true,
                    message: 'Balance transferred successfully',
                    amount,
                    commission,
                    netAmount
                });
            } catch (error) {
                throw error;
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    getTransactionHistory: async (req, res) => {
        try {
            const user = req.user;
            const { page = 1, limit = 10, type } = req.query;
            const skip = (page - 1) * limit;

            const query = {
                $or: [
                    { sender: user._id },
                    { receiver: user._id }
                ]
            };

            if (type) {
                query.type = type;
            }

            const transactions = await Transaction.find(query)
                .populate('sender', 'username email')
                .populate('receiver', 'username email')
                .sort('-createdAt')
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Transaction.countDocuments(query);

            res.json({
                success: true,
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    selfRecharge: async (req, res) => {
        try {
            const { amount } = req.body;
            const user = req.user;

            // Only owner can self recharge
            if (user.role !== 'owner') {
                return res.status(403).json({
                    success: false,
                    message: 'Only owner can self recharge'
                });
            }

            await User.findByIdAndUpdate(user._id, {
                $inc: { balance: amount }
            });

            await Transaction.create({
                sender: user._id,
                receiver: user._id,
                amount,
                type: 'credit',
                description: 'Self recharge',
                balanceBefore: user.balance,
                balanceAfter: user.balance + amount
            });

            res.json({
                success: true,
                message: 'Balance recharged successfully',
                newBalance: user.balance + amount
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    getBalanceSummary: async (req, res) => {
        try {
            const user = req.user;

            // Admin can see all balances
            if (user.role === 'admin') {
                const summary = await User.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalBalance: { $sum: '$balance' },
                            totalCommission: { $sum: '$commissionEarned' },
                            userCount: { $sum: 1 },
                            averageBalance: { $avg: '$balance' }
                        }
                    }
                ]);

                return res.json({
                    success: true,
                    summary: summary[0] || {}
                });
            }

            // Others see only their downline
            const downlineUsers = await User.find({
                path: { $regex: `^${user._id}` }
            });

            const summary = {
                totalBalance: downlineUsers.reduce((sum, u) => sum + u.balance, 0),
                totalCommission: downlineUsers.reduce((sum, u) => sum + u.commissionEarned, 0),
                userCount: downlineUsers.length,
                averageBalance: downlineUsers.reduce((sum, u) => sum + u.balance, 0) / downlineUsers.length || 0
            };

            res.json({
                success: true,
                summary
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = BalanceController;