import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { sendRegisterationEmail } from "../services/email.service.js";
import TokenBlacklist from "../models/blackList.model.js";



// /api/auth/register
export const userRegisterController = async(req, res) => {
   const {email, name, password} = req.body

   const isExists = await User.findOne({
      email: email
   })

   if(isExists){
      return res.status(422).json({message: "User already exists", status: "failed"})
   }

   const user = await User.create({email, password, name})  

   // this sign method ask for payload and private key
   const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"})
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3 * 24 * 60 * 60 * 1000 })

   res.status(201).json({
      user: {
         _id: user._id,
         email: user.email,
         name: user.name
      },
      token
   })

   await sendRegisterationEmail(user.email, user.name)

}

// /api/auth/login
export const userLoginController = async (req, res) => {
   const {email, password} = req.body;

    const user = await User.findOne({ email }).select("+password");

    if(!user){
      return res.status(401).json({message: "Email or password is invalid"})
    }

    const isValidPassword = await user.comparePassword(password)

    if(!isValidPassword){
      return res.status(401).json({message: "Email or password is invalid"})
    }

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"})
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3 * 24 * 60 * 60 * 1000 })

    res.status(200).json({
      user: {
         _id: user._id,
         email: user.email,
         name: user.name
      },
      token
   })


}


/**
 * User Logout Controller
 * POST /api/auth/logout
 */
export const userLogoutController = async (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(200).json({
        message: "User logged out successfully",
      });
    }

    await TokenBlacklist.updateOne({ token }, { $setOnInsert: { token } }, { upsert: true });

    res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });

    return res.status(200).json({
      message: "User logged out successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong during logout",
    });
  }
};



