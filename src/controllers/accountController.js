const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

async function getOwnedAccount(accountId, userId) {
  const account = await Account.findById(accountId);

  if (!account) {
    throw new AppError('Account not found', 404);
  }

  if (account.user.toString() !== userId.toString()) {
    throw new AppError('You do not own this account', 403);
  }

  return account;
}

function parseAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Amount must be a positive number', 400);
  }

  return Math.round(amount * 100) / 100;
}

exports.createAccount = asyncHandler(async (req, res) => {
  const account = await Account.create({
    user: req.user._id,
    balance: 0,
  });

  res.status(201).json({
    success: true,
    message: 'Account created',
    data: { account },
  });
});

exports.getBalance = asyncHandler(async (req, res) => {
  const account = await getOwnedAccount(req.params.accountId, req.user._id);

  res.status(200).json({
    success: true,
    data: {
      accountId: account._id,
      accountNumber: account.accountNumber,
      balance: account.balance,
    },
  });
});

exports.deposit = asyncHandler(async (req, res) => {
  const { amount, description } = req.body || {};
  const parsedAmount = parseAmount(amount);
  const account = await getOwnedAccount(req.params.accountId, req.user._id);

  account.balance = Math.round((account.balance + parsedAmount) * 100) / 100;
  await account.save();

  const transaction = await Transaction.create({
    type: 'deposit',
    amount: parsedAmount,
    toAccount: account._id,
    description: description || 'Deposit',
  });

  res.status(200).json({
    success: true,
    message: 'Deposit successful',
    data: {
      balance: account.balance,
      transaction,
    },
  });
});

exports.transfer = asyncHandler(async (req, res) => {
  const { amount, toAccountId, description } = req.body || {};
  const parsedAmount = parseAmount(amount);

  if (!toAccountId) {
    throw new AppError('toAccountId is required', 400);
  }

  if (toAccountId.toString() === req.params.accountId.toString()) {
    throw new AppError('Cannot transfer to the same account', 400);
  }

  const sender = await getOwnedAccount(req.params.accountId, req.user._id);
  const receiver = await Account.findById(toAccountId);

  if (!receiver) {
    throw new AppError('Destination account not found', 404);
  }

  if (sender.balance < parsedAmount) {
    throw new AppError('Insufficient balance', 400);
  }

  sender.balance = Math.round((sender.balance - parsedAmount) * 100) / 100;
  await sender.save();

  try {
    receiver.balance = Math.round((receiver.balance + parsedAmount) * 100) / 100;
    await receiver.save();
  } catch (error) {
    sender.balance = Math.round((sender.balance + parsedAmount) * 100) / 100;
    await sender.save();
    throw error;
  }

  const transaction = await Transaction.create({
    type: 'transfer',
    amount: parsedAmount,
    fromAccount: sender._id,
    toAccount: receiver._id,
    description: description || 'Transfer',
  });

  res.status(200).json({
    success: true,
    message: 'Transfer successful',
    data: {
      fromAccount: {
        id: sender._id,
        balance: sender.balance,
      },
      toAccount: {
        id: receiver._id,
        accountNumber: receiver.accountNumber,
      },
      transaction,
    },
  });
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const account = await getOwnedAccount(req.params.accountId, req.user._id);

  const transactions = await Transaction.find({
    $or: [{ fromAccount: account._id }, { toAccount: account._id }],
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: { transactions },
  });
});
