import express from "express"
import authMiddleware from "../middleware/auth.middleware.js";
import { createAccountController, getAccountBalanceController, getUserAccountsController } from "../controllers/account.controller.js";

const  router = express.Router();


// api endpint post method this create a protected route and create a account 
router.post("/", authMiddleware, createAccountController)
router.get("/", authMiddleware, getUserAccountsController)
router.get("/:accountId/balance", authMiddleware, getAccountBalanceController)

export default router;
