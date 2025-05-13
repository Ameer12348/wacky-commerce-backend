const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

async function getAllWishlist(request, response) {
  try {
    const wishlist = await prisma.wishlist.findMany({
      include: {
        productVariant: {
          include: {
            product: true,
          },
        }, // Include product details
      },
    });
    return response.json(wishlist);
  } catch (error) {
    return response.status(500).json({ error: "Error fetching wishlist" });
  }
}

async function getAllWishlistByUserId(request, response) {
  const { userId } = request.params;
  try {
    // getting all products by userId
    const wishlist = await prisma.wishlist.findMany({
      where: {
        userId: userId,
      },
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
    });
    return response.json(wishlist);
  } catch (error) {
    return response.status(500).json({ error: "Error fetching wishlist" });
  }
}

async function createWishItem(request, response) {
  try {
    const { userId, productVariantId } = request.body;
    const wishItem = await prisma.wishlist.create({
      data: {
        userId,
        productVariantId,
      },
    });
    return response.status(201).json(wishItem);
  } catch (error) {
    console.error("Error creating wish item:", error);
    return response.status(500).json({ error: "Error creating wish item" });
  }
}

async function deleteWishItem(request, response) {
  try {
    const { userId, productVariantId } = request.params;

    await prisma.wishlist.deleteMany({
      where: {
        userId: userId,
        productVariantId: productVariantId,
      },
    });

    return response.status(204).send();
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: "Error deleting wish item" });
  }
}

async function getSingleProductFromWishlist(request, response) {
  try {
    const { userId, productVariantId } = request.params;

    const wishItem = await prisma.wishlist.findMany({
      where: {
        userId: userId,
        productVariantId: productVariantId,
      },
    });

    return response.status(200).json(wishItem);
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: "Error getting wish item" });
  }
}

async function deleteAllWishItemByUserId(request, response) {
  try {
    const { userId } = request.params;

    await prisma.wishlist.deleteMany({
      where: {
        userId: userId,
      },
    });

    return response.status(204).send();
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: "Error deleting wish item" });
  }
}

module.exports = {
  getAllWishlistByUserId,
  getAllWishlist,
  createWishItem,
  deleteWishItem,
  getSingleProductFromWishlist,
};
