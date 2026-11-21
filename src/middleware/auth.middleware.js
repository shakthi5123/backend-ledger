import jwt from "jsonwebtoken"
import User from "../models/user.model.js"
import TokenBlacklist from "../models/blackList.model.js"

const authMiddleware = async (req, res, next) => {
   try {
      // Get the token from the cookies 
      const token = req.cookies?.token || req.headers.authorization?.split(" ")[1] 

      // check whether the token exists 
      if(!token){
         return res.status(401).json({success: false, message: "Please login first"});
      }

      // verify the token 
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      if (await TokenBlacklist.exists({ token })) {
         return res.status(401).json({ success: false, message: "Please login again" })
      }

      // Attach the user information to the request 
      const user = await User.findById(decoded.userId)

      if (!user) return res.status(401).json({ success: false, message: "User no longer exists" })
      req.user = user
      
      // Allow the request to continue 
      next();

   } catch (error) {
      return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
   }
}
 
export const authSystemUserMiddleware = async (req, res, next) => {
   const token = req.cookies?.token || req.headers.authorization?.split(" ")[1]

   if(!token){
         return res.status(401).json({success: false, message: "Unauthorize access, token is missing"});
          
      } 

   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      if (await TokenBlacklist.exists({ token })) return res.status(401).json({ message: "Please login again" })

      const user = await User.findById(decoded.userId).select("+systemUser")
      if(!user || !user.systemUser){
         return res.status(403).json({message: "Forbidden access, not a system user"})
      }

      req.user = user
      return next();

 
      
   } catch (error) {
      return res.status(401).json({message: "Unauthorized access, token invalid"})
   }
}

export default authMiddleware;
