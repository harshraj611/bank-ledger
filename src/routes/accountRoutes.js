const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createAccount,
  getBalance,
  deposit,
  transfer,
  getTransactions,
} = require('../controllers/accountController');

const router = express.Router();

router.use(protect);

router.post('/', createAccount);
router.get('/:accountId/balance', getBalance);
router.get('/:accountId/transactions', getTransactions);
router.post('/:accountId/deposit', deposit);
router.post('/:accountId/transfer', transfer);

module.exports = router;
