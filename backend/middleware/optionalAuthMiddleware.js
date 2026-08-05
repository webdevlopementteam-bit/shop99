const jwt = require("jsonwebtoken");

/**
 * Sets req.user from Bearer token if valid; req.user = null if no token.
 * Invalid/expired token → 401.
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = optionalAuthMiddleware;
