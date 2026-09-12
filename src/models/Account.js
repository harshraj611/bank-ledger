const mongoose = require('mongoose');
const crypto = require('crypto');

const accountSchema = new mongoose.Schema(
  {
    accountNumber: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
  },
  { timestamps: true }
);

accountSchema.pre('validate', function setAccountNumber() {
  if (!this.accountNumber) {
    this.accountNumber = crypto.randomBytes(5).toString('hex').toUpperCase();
  }
});

module.exports = mongoose.model('Account', accountSchema);
