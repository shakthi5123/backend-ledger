import mongoose from 'mongoose'
import ledgerModel from './ledger.model.js'

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account must be associated with a user'],
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'FROZEN', 'CLOSE'],
        message: 'Status must be ACTIVE, FROZEN, or CLOSE',
      },
      default: 'ACTIVE',
    },
    kind: {
      type: String,
      enum: ['USER', 'TREASURY', 'CAPITAL'],
      default: 'USER',
      immutable: true,
      select: false,
    },
    currency: {
      type: String,
      required: [true, 'Currency is required for creating an account'],
      default: 'INR',
    },
    balanceVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  { timestamps: true },
)

accountSchema.index({ user: 1, status: 1, kind: 1 })
accountSchema.index({ user: 1 }, {
  unique: true,
  partialFilterExpression: { kind: 'TREASURY' },
  name: 'unique_treasury_per_user',
})
accountSchema.index({ user: 1 }, {
  unique: true,
  partialFilterExpression: { kind: 'CAPITAL' },
  name: 'unique_capital_per_user',
})

accountSchema.methods.getBalance = async function (session) {
  let aggregation = ledgerModel.aggregate([
    { $match: { account: this._id } },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ['$type', 'DEBIT'] }, '$amount', 0],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ['$type', 'CREDIT'] }, '$amount', 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        balance: {$subtract: ["$totalCredit", "$totalDebit"]}
      },
    },
  ])
  if (session) aggregation = aggregation.session(session)
  const balanceData = await aggregation

  if(balanceData.length === 0){
   return 0;
  }
  return balanceData[0].balance
}

const accountModel = mongoose.model('account', accountSchema)

export default accountModel
