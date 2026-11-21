import mongoose from 'mongoose'
import transactionModel from '../models/transaction.model.js'
import accountModel from '../models/account.model.js'
import ledgerModel from '../models/ledger.model.js'
import { sendTransactionEmail } from '../services/email.service.js'

const validAmount = (amount) => Number.isFinite(Number(amount)) && Number(amount) > 0

const idempotentResponse = (transaction, res) => {
  if (!transaction) return null
  if (transaction.status === 'COMPLETED') {
    return res.status(200).json({ message: 'Transaction already processed', transaction })
  }
  if (transaction.status === 'PENDING') {
    return res.status(409).json({ message: 'Transaction is still processing' })
  }
  return res.status(409).json({ message: `Transaction is ${transaction.status.toLowerCase()}; use a new idempotency key to retry` })
}

export const createTransaction = async (req, res) => {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body
  if (!fromAccount || !toAccount || !validAmount(amount) || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    return res.status(400).json({ message: 'Valid fromAccount, toAccount, positive amount, and idempotencyKey are required' })
  }
  if (!mongoose.isValidObjectId(fromAccount) || !mongoose.isValidObjectId(toAccount)) {
    return res.status(400).json({ message: 'Account IDs are invalid' })
  }
  if (fromAccount === toAccount) return res.status(400).json({ message: 'Source and destination accounts must differ' })

  const previous = await transactionModel.findOne({ idempotencyKey: idempotencyKey.trim() })
  const priorResponse = idempotentResponse(previous, res)
  if (priorResponse) return priorResponse

  const [fromUserAccount, toUserAccount] = await Promise.all([
    accountModel.findOne({ _id: fromAccount, kind: 'USER' }),
    accountModel.findOne({ _id: toAccount, kind: 'USER' }),
  ])
  if (!fromUserAccount || !toUserAccount) return res.status(404).json({ message: 'Source or destination account not found' })
  if (String(fromUserAccount.user) !== String(req.user._id)) return res.status(403).json({ message: 'You do not own the source account' })
  if (fromUserAccount.status !== 'ACTIVE' || toUserAccount.status !== 'ACTIVE') {
    return res.status(409).json({ message: 'Both accounts must be ACTIVE to process a transaction' })
  }

  const session = await mongoose.startSession()
  let transaction
  try {
    await session.withTransaction(async () => {
      // Write to the sender account inside this transaction so concurrent
      // transfers from the same account conflict and retry against a fresh balance.
      const sender = await accountModel.findOneAndUpdate(
        { _id: fromAccount, kind: 'USER' },
        { $inc: { balanceVersion: 1 } },
        { returnDocument: 'after', session, select: '+balanceVersion' },
      )
      const recipient = await accountModel.findOne({ _id: toAccount, kind: 'USER' }).session(session)
      if (!sender || !recipient || String(sender.user) !== String(req.user._id)) {
        const error = new Error('Account changed or is unavailable')
        error.status = 404
        throw error
      }
      if (sender.status !== 'ACTIVE' || recipient.status !== 'ACTIVE') {
        const error = new Error('Both accounts must be ACTIVE')
        error.status = 409
        throw error
      }
      const balance = await sender.getBalance(session)
      if (balance < Number(amount)) {
        const error = new Error(`Insufficient balance. Current balance is ${balance}.`)
        error.status = 400
        throw error
      }

      ;[transaction] = await transactionModel.create([{
        fromAccount, toAccount, amount: Number(amount), idempotencyKey: idempotencyKey.trim(), status: 'PENDING',
      }], { session })
      await ledgerModel.create([
        { account: fromAccount, amount: Number(amount), transaction: transaction._id, type: 'DEBIT' },
        { account: toAccount, amount: Number(amount), transaction: transaction._id, type: 'CREDIT' },
      ], { session, ordered: true })
      transaction.status = 'COMPLETED'
      await transaction.save({ session })
    })
  } catch (error) {
    if (error.code === 11000) {
      const existing = await transactionModel.findOne({ idempotencyKey: idempotencyKey.trim() })
      const response = idempotentResponse(existing, res)
      if (response) return response
    }
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Transaction could not be completed' })
  } finally {
    await session.endSession()
  }

  await sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)
  return res.status(201).json({ message: 'Transaction completed successfully', transaction })
}

export const createInitialFundsTransaction = async (req, res) => {
  const { toAccount, amount, idempotencyKey } = req.body
  if (!toAccount || !validAmount(amount) || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    return res.status(400).json({ message: 'Valid toAccount, positive amount, and idempotencyKey are required' })
  }
  if (!mongoose.isValidObjectId(toAccount)) return res.status(400).json({ message: 'Account ID is invalid' })

  const previous = await transactionModel.findOne({ idempotencyKey: idempotencyKey.trim() })
  const priorResponse = idempotentResponse(previous, res)
  if (priorResponse) return priorResponse

  const [recipient, systemAccount] = await Promise.all([
    accountModel.findOne({ _id: toAccount, kind: 'USER' }),
    accountModel.findOne({ user: req.user._id, kind: 'TREASURY', status: 'ACTIVE' }).select('+kind'),
  ])
  if (!recipient || recipient.status !== 'ACTIVE') return res.status(404).json({ message: 'Active destination account not found' })
  if (!systemAccount) return res.status(404).json({ message: 'System user account not found' })
  if (String(systemAccount._id) === String(recipient._id)) return res.status(400).json({ message: 'Source and destination accounts must differ' })

  const session = await mongoose.startSession()
  let transaction
  try {
    await session.withTransaction(async () => {
      const fundingSource = await accountModel.findOneAndUpdate(
        { _id: systemAccount._id, kind: 'TREASURY', status: 'ACTIVE' },
        { $inc: { balanceVersion: 1 } },
        { returnDocument: 'after', session, select: '+balanceVersion' },
      )
      const destination = await accountModel.findOne({ _id: toAccount, kind: 'USER' }).session(session)
      if (!fundingSource || !destination || destination.status !== 'ACTIVE') {
        const error = new Error('Source or destination account is unavailable')
        error.status = 404
        throw error
      }
      const balance = await fundingSource.getBalance(session)
      if (balance < Number(amount)) {
        const error = new Error(`Insufficient system account balance. Current balance is ${balance}.`)
        error.status = 400
        throw error
      }
      ;[transaction] = await transactionModel.create([{
        fromAccount: systemAccount._id, toAccount, amount: Number(amount),
        idempotencyKey: idempotencyKey.trim(), status: 'PENDING',
      }], { session })
      await ledgerModel.create([
        { account: systemAccount._id, amount: Number(amount), transaction: transaction._id, type: 'DEBIT' },
        { account: toAccount, amount: Number(amount), transaction: transaction._id, type: 'CREDIT' },
      ], { session, ordered: true })
      transaction.status = 'COMPLETED'
      await transaction.save({ session })
    })
  } catch (error) {
    if (error.code === 11000) {
      const existing = await transactionModel.findOne({ idempotencyKey: idempotencyKey.trim() })
      const response = idempotentResponse(existing, res)
      if (response) return response
    }
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Initial funds transaction could not be completed' })
  } finally {
    await session.endSession()
  }
  return res.status(201).json({ message: 'Initial funds transaction completed successfully', transaction })
}
