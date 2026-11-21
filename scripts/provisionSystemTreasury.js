import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../src/models/user.model.js'
import accountModel from '../src/models/account.model.js'
import transactionModel from '../src/models/transaction.model.js'
import ledgerModel from '../src/models/ledger.model.js'

const userId = process.env.SYSTEM_USER_ID
const openingBalance = Number(process.env.SYSTEM_TREASURY_OPENING_BALANCE || 1000)

if (!mongoose.isValidObjectId(userId)) {
  console.error('Set SYSTEM_USER_ID to the MongoDB _id of the user who should be a system user.')
  process.exit(1)
}

if (!Number.isFinite(openingBalance) || openingBalance <= 0) {
  console.error('SYSTEM_TREASURY_OPENING_BALANCE must be a positive number.')
  process.exit(1)
}

const openingKey = `system-opening-${userId}`

try {
  await mongoose.connect(process.env.MONGODB_URI)

  const user = await User.findById(userId).select('+systemUser')
  if (!user) throw new Error(`No user found with ID ${userId}.`)

  // Existing accounts predate account kinds; classify them as user accounts.
  await accountModel.collection.updateMany(
    { $or: [{ kind: { $exists: false } }, { kind: null }] },
    { $set: { kind: 'USER' } },
  )

  // This is an operator-run bootstrap script, so it intentionally updates the
  // role through the native collection and bypasses the schema's immutability.
  await User.collection.updateOne({ _id: user._id }, { $set: { systemUser: true } })
  await accountModel.init()

  let treasury = await accountModel.findOne({ user: user._id, kind: 'TREASURY' }).select('+kind')
  if (!treasury) {
    treasury = await accountModel.create({ user: user._id, kind: 'TREASURY', currency: 'INR' })
  }

  let capital = await accountModel.findOne({ user: user._id, kind: 'CAPITAL' }).select('+kind')
  if (!capital) {
    capital = await accountModel.create({ user: user._id, kind: 'CAPITAL', currency: 'INR' })
  }

  let openingTransaction = await transactionModel.findOne({ idempotencyKey: openingKey })
  if (!openingTransaction) {
    const existingTreasuryBalance = await treasury.getBalance()
    if (existingTreasuryBalance !== 0) {
      throw new Error(`Treasury already has a balance of ${existingTreasuryBalance}; refusing to add another opening balance.`)
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        ;[openingTransaction] = await transactionModel.create([{
          fromAccount: capital._id,
          toAccount: treasury._id,
          amount: openingBalance,
          idempotencyKey: openingKey,
          status: 'COMPLETED',
        }], { session })

        await ledgerModel.create([
          { account: capital._id, amount: openingBalance, transaction: openingTransaction._id, type: 'DEBIT' },
          { account: treasury._id, amount: openingBalance, transaction: openingTransaction._id, type: 'CREDIT' },
        ], { session, ordered: true })
      })
    } finally {
      await session.endSession()
    }
  } else if (openingTransaction.amount !== openingBalance) {
    console.warn(`Existing opening transaction is ${openingTransaction.amount}; it was left unchanged.`)
  }

  const balance = await treasury.getBalance()
  console.log(JSON.stringify({
    userId: String(user._id),
    systemUser: true,
    treasuryAccountId: String(treasury._id),
    openingCapitalAccountId: String(capital._id),
    treasuryBalance: balance,
    currency: treasury.currency,
    openingTransactionId: String(openingTransaction._id),
  }, null, 2))
} catch (error) {
  console.error(`System treasury provisioning failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
