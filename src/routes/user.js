const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// User hierarchy routes
router.get('/downline', userController.getDownline);
router.post('/create-user', userController.createNextLevelUser);
router.put('/change-password', userController.changePassword);

// Admin routes
router.get('/all', authorize('admin'), userController.getAllUsers);

module.exports = router;