// import jwt from "jsonwebtoken";

// const isUserAuthenticated = async (req, res, next) => {
//   try {
//     const token = req.cookies?.token;
//     console.log("Token is", token);
//     if (!token) {
//       return res.status(401).json({ message: "User  is not authenticated" });
//     }
//     const decode = await jwt.verify(token, process.env.JWT_SECRET_KEY);
//     if (!decode || !decode.userId) {
//       return res.status(401).json({ message: "Invalid token" });
//     }
//     console.log(`Decoded is  ${decode}`);
    
//     req.id = decode.userId;

//     next();
//   } catch (error) {
//     console.log(error);
//   }
// };
// export default isUserAuthenticated;


import jwt from "jsonwebtoken";

const isUserAuthenticatedOld = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    console.log(req.cookies?.token)
    console.log("Token is", token);

    if (!token) {
      return res
        .status(401)
        .json({ auth: false, message: "User is not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ auth: false, message: "Invalid token" });
    }

    console.log("Decoded:", decoded);
    req.id = decoded.userId; // for downstream use
    next();
  } catch (error) {
    console.log("JWT verify error:", error.message);
    return res
      .status(401)
      .json({ auth: false, message: "Token verification failed" });
  }
};

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
