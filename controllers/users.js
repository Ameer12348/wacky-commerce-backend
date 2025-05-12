const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function getAllUsers(request, response) {
  try {
    const users = await prisma.user.findMany({});
    return response.json(users);
  } catch (error) {
    return response.status(500).json({ error: "Error fetching users" });
  }
}

async function createUser(request, response) {
  try {
    const { email, password, role } = request.body;
    const hashedPassword = await bcrypt.hash(password, 5);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });
    return response.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return response.status(500).json({ error: "Error creating user" });
  }
}

async function updateUser(request, response) {
  try {
    const { id } = request.params;
    const { email, password, role } = request.body;
    const hashedPassword = await bcrypt.hash(password, 5);
    const existingUser = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingUser) {
      return response.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    return response.status(200).json(updatedUser);
  } catch (error) {
    return response.status(500).json({ error: "Error updating user" });
  }
}

async function deleteUser(request, response) {
  try {
    const { id } = request.params;
    await prisma.user.delete({
      where: {
        id: id,
      },
    });
    return response.status(204).send();
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: "Error deleting user" });
  }
}

async function getUser(request, response) {
  const { id } = request.params;
  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });
  if (!user) {
    return response.status(404).json({ error: "User not found" });
  }
  return response.status(200).json(user);
}

async function getUserByEmail(request, response) {
  const { email } = request.params;
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (!user) {
    return response.status(404).json({ error: "User not found" });
  }
  return response.status(200).json(user);
}

async function registerUser(req, res) {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 5);
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    // if user exists, return error
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "user",
      },
    });
    return res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Error creating user" });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    // if user does not exist, return error
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    // if password is incorrect, return error
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      "secret_key"
    );
    res.cookie("token", token, { httpOnly: true });
    return res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({ error: "Error logging in user" });
  }
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getUser,
  getAllUsers,
  getUserByEmail,
  registerUser,
  loginUser,
};
