const express = require("express");

const router = express.Router();

const {
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserByEmail,
  loginUser,
  registerUser,
} = require("../controllers/users");

router.route("/").get(getAllUsers).post(createUser);

router.route("/:id").get(getUser).put(updateUser).delete(deleteUser);

router.route("/email/:email").get(getUserByEmail);
router.post("/login", loginUser);
router.post("/register", registerUser);

module.exports = router;
