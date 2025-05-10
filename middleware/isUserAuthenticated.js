import jwt from "jsonwebtoken";

const isUserAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    
    if (!token) {
      return res
        .status(401)
        .json({ auth: false, message: "User is not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ auth: false, message: "Invalid token" });
    }

    req.id = decoded.userId;
    next();
  } catch (error) {
    console.error("JWT verify error:", error.message);
    return res
      .status(401)
      .json({ auth: false, message: "Token verification failed" });
  }
};


export default isUserAuthenticated;
