const express = require('express');
const router = express.Router();
const balanceController = require('../controllers/balanceController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.post('/credit', balanceController.creditBalance);
router.post('/recharge', balanceController.selfRecharge);
router.get('/transactions', balanceController.getTransactionHistory);
router.get('/summary', balanceController.getBalanceSummary);

module.exports = router;