const admin = require("../firebase");

async function authenticateFirebase(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }
  const idToken = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUid = decodedToken.uid;
    req.firebaseEmail = decodedToken.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired ID token." });
  }
}
module.exports = authenticateFirebase;