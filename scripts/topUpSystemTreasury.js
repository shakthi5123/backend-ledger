import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../src/models/user.model.js'
import accountModel from '../src/models/account.model.js'
import transactionModel from '../src/models/transaction.model.js'
import ledgerModel from '../src/models/ledger.model.js'

const userId = process.env.SYSTEM_USER_ID
const amount = Number(process.env.TREASURY_TOPUP_AMOUNT)
const reference = process.env.TREASURY_TOPUP_REFERENCE?.trim()

if (!mongoose.isValidObjectId(userId)) {
  console.error('Set SYSTEM_USER_ID to the MongoDB _id of the system user.')
  process.exit(1)
}

if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Set TREASURY_TOPUP_AMOUNT to a positive number.')
  process.exit(1)
}

if (!reference) {
  console.error('Set TREASURY_TOPUP_REFERENCE to a unique reference for this top-up.')
  process.exit(1)
}

const idempotencyKey = `treasury-topup-${userId}-${reference}`

try {
  await mongoose.connect(process.env.MONGODB_URI)

  const user = await User.findById(userId).select('+systemUser')
  if (!user?.systemUser) throw new Error('The selected user is not a system user.')

  const [treasury, capital] = await Promise.all([
    accountModel.findOne({ user: user._id, kind: 'TREASURY', status: 'ACTIVE' }).select('+kind'),
    accountModel.findOne({ user: user._id, kind: 'CAPITAL' }).select('+kind'),
  ])
  if (!treasury || !capital) throw new Error('Treasury or capital account is missing. Run the provisioning command first.')

  const existing = await transactionModel.findOne({ idempotencyKey })
  let alreadyApplied = false
  if (existing) {
    if (
      String(existing.fromAccount) !== String(capital._id) ||
      String(existing.toAccount) !== String(treasury._id) ||
      existing.amount !== amount ||
      existing.status !== 'COMPLETED'
    ) {
      throw new Error('This reference was already used with different top-up details. Choose a new reference.')
    }
    alreadyApplied = true
  } else {
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const lockedTreasury = await accountModel.findOneAndUpdate(
          { _id: treasury._id, kind: 'TREASURY', status: 'ACTIVE' },
          { $inc: { balanceVersion: 1 } },
          { returnDocument: 'after', session, select: '+balanceVersion' },
        )
        if (!lockedTreasury) throw new Error('The treasury is no longer active.')

        const [transaction] = await transactionModel.create([{
          fromAccount: capital._id,
          toAccount: treasury._id,
          amount,
          idempotencyKey,
          status: 'COMPLETED',
        }], { session })

        await ledgerModel.create([
          { account: capital._id, amount, transaction: transaction._id, type: 'DEBIT' },
          { account: treasury._id, amount, transaction: transaction._id, type: 'CREDIT' },
        ], { session, ordered: true })
      })
    } finally {
      await session.endSession()
    }
  }

  console.log(JSON.stringify({
    reference,
    amountAdded: alreadyApplied ? 0 : amount,
    requestedAmount: amount,
    alreadyApplied,
    treasuryAccountId: String(treasury._id),
    treasuryBalance: await treasury.getBalance(),
    currency: treasury.currency,
  }, null, 2))
} catch (error) {
  console.error(`Treasury top-up failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
