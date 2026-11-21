import express from "express";
import authMiddleware, { authSystemUserMiddleware } from "../middleware/auth.middleware.js";
import { createInitialFundsTransaction, createTransaction } from "../controllers/transaction.controller.js";


const router = express.Router();

// post /api/transaction/create
router.post("/", authMiddleware, createTransaction);

// POST create a initial fund transactions 
router.post("/system/initial-funds", authSystemUserMiddleware,  createInitialFundsTransaction)

export default router;