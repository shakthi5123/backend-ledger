// the work of this is to create a server instance and config server (what are the middleware we are using and all the api )
// but importantly this wont start the server 
import express from 'express'
import authRouter from './routes/auth.routes.js';
import accountRouter from './routes/account.routes.js'
import transactionRouter from './routes/transaction.routes.js'
import cookieParser from 'cookie-parser';

const app = express();


app.use(express.json()),
app.use(cookieParser( ))

// Using routes
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter );

app.use((error, req, res, next) => {
  console.error(error)
  if (res.headersSent) return next(error)
  const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500
  return res.status(status).json({
    success: false,
    message: status === 400 ? error.message : 'An unexpected server error occurred',
  })
})

export default app;




