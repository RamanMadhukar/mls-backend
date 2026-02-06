const User = require('../models/User');

// Helper function - define it outside
const buildHierarchy = (parentId, users) => {
    const children = users.filter(user =>
        user.parentId && user.parentId.toString() === parentId.toString()
    );

    return children.map(child => ({
        user: child,
        children: buildHierarchy(child._id, users)
    }));
};

const UserController = {
    getDownline: async (req, res) => {
        try {
            const user = req.user;

            // Find all users in downline using path
            const downlineUsers = await User.find({
                path: { $regex: `^${user._id}` }
            }).select('-password');

            // Organize hierarchy
            const hierarchy = buildHierarchy(user._id, downlineUsers);

            res.json({
                success: true,
                downline: hierarchy,
                count: downlineUsers.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    createNextLevelUser: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            const parentUser = req.user;

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [{ email }, { username }]
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists'
                });
            }

            // Create user at next level
            const newUser = await User.create({
                username,
                email,
                password,
                role: 'user',
                parentId: parentUser._id,
                level: parentUser.level + 1,
                path: parentUser.path ? `${parentUser.path}.${parentUser._id}` : parentUser._id.toString()
            });

            res.status(201).json({
                success: true,
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    email: newUser.email,
                    level: newUser.level,
                    parentId: newUser.parentId
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    changePassword: async (req, res) => {
        try {
            const { userId, newPassword } = req.body;
            const currentUser = req.user;

            // Find the user
            const userToUpdate = await User.findById(userId);

            if (!userToUpdate) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is immediate child
            if (userToUpdate.parentId.toString() !== currentUser._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Can only change password for immediate downline users'
                });
            }

            // Update password
            userToUpdate.password = newPassword;
            await userToUpdate.save();

            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const users = await User.find({ role: 'user' })
                .select('-password')
                .populate('parentId', 'username email');

            res.json({
                success: true,
                users
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = UserController;