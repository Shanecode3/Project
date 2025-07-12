const pool = require("../db");

async function getUserByFirebaseUid(firebaseUid) {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE firebase_uid = $1",
    [firebaseUid]
  );
  return rows[0] || null;
}

async function createUserIfNotExists(firebaseUid, email) {
  await pool.query(
    "INSERT INTO users (firebase_uid, email) VALUES ($1, $2) ON CONFLICT (firebase_uid) DO UPDATE SET email=EXCLUDED.email",
    [firebaseUid, email]
  );
}

async function setFreeTrialUsed(firebaseUid) {
  await pool.query(
    "UPDATE users SET has_used_free_trial = TRUE WHERE firebase_uid = $1",
    [firebaseUid]
  );
}

async function setUserPaid(firebaseUid) {
  await pool.query(
    "UPDATE users SET has_paid = TRUE WHERE firebase_uid = $1",
    [firebaseUid]
  );
}

async function setUserUnpaid(firebaseUid) {
  await pool.query(
    "UPDATE users SET has_paid = FALSE WHERE firebase_uid = $1",
    [firebaseUid]
  );
}

module.exports = {
  getUserByFirebaseUid,
  createUserIfNotExists,
  setFreeTrialUsed,
  setUserPaid,
  setUserUnpaid
};
