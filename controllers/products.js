const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getAllProducts(request, response) {
  const mode = request.query.mode || "";
  if (mode === "admin") {
    try {
      const adminProducts = await prisma.product.findMany({
        include: {
          variants: true,
        },
      });
      return response.json(adminProducts);
    } catch (error) {
      return response.status(500).json({ error: "Error fetching products" });
    }
  } else {
    const dividerLocation = request.url.indexOf("?");
    const page = Number(request.query.page) || 1;
    let sortObj = {};
    let sortByValue = "defaultSort";

    // Arrays to hold filters
    let filterArray = [];

    // Parse query parameters if present
    if (dividerLocation !== -1) {
      const queryArray = request.url.substring(dividerLocation + 1).split("&");

      for (let i = 0; i < queryArray.length; i++) {
        if (queryArray[i].startsWith("filters.")) {
          const parts = queryArray[i].split("$");
          if (parts.length === 2) {
            const fieldPart = parts[0].substring("filters.".length); // e.g., "price"
            const operatorValue = parts[1].split("=");
            if (operatorValue.length === 2) {
              const filterType = fieldPart; // e.g., "price", "rating"
              const filterOperator = operatorValue[0]; // e.g., "lte"
              let filterValue = operatorValue[1]; // e.g., "3000"

              // Convert value to number unless it’s a category filter
              if (filterType !== "category") {
                filterValue = parseInt(filterValue);
              }

              filterArray.push({ filterType, filterOperator, filterValue });
            }
          }
        } else if (queryArray[i].startsWith("sort=")) {
          sortByValue = queryArray[i].substring(queryArray[i].indexOf("=") + 1);
        }
      }
    }

    // Define valid fields for Product and ProductVariant
    const productFields = ["rating", "title", "manufacturer"];
    const variantFields = ["price", "inStock"];

    // Separate filters
    const productFilters = {};
    const variantFilters = {};
    let categoryFilter = null;

    for (let item of filterArray) {
      if (item.filterType === "category") {
        categoryFilter = item;
      } else if (variantFields.includes(item.filterType)) {
        variantFilters[item.filterType] = {
          [item.filterOperator]: item.filterValue,
        };
      } else if (productFields.includes(item.filterType)) {
        productFilters[item.filterType] = {
          [item.filterOperator]: item.filterValue,
        };
      }
      // Unsupported filter types (e.g., "outOfStock") are ignored
    }

    // Construct where clause
    let whereClause = { ...productFilters };
    if (Object.keys(variantFilters).length > 0) {
      whereClause.variants = {
        some: variantFilters, // Filter products with at least one matching variant
      };
    }
    if (categoryFilter) {
      whereClause.category = {
        name: { equals: categoryFilter.filterValue },
      };
    }

    // Set sorting
    if (sortByValue === "defaultSort") {
      sortObj = {};
    } else if (sortByValue === "titleAsc") {
      sortObj = { title: "asc" };
    } else if (sortByValue === "titleDesc") {
      sortObj = { title: "desc" };
    } else if (sortByValue === "lowPrice") {
      sortObj = { variants: { some: { price: "asc" } } }; // Sort by variant price
    } else if (sortByValue === "highPrice") {
      sortObj = { variants: { some: { price: "desc" } } };
    }

    // Fetch products
    try {
      const products = await prisma.product.findMany({
        skip: (page - 1) * 10,
        take: 12,
        include: {
          category: { select: { name: true } },
          variants: true,
        },
        where: whereClause,
        orderBy: sortObj,
      });
      return response.json(products);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error fetching products" });
    }
  }
}

async function getAllProductsOld(request, response) {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });
    response.status(200).json(products);
  } catch (error) {
    console.log(error);
  }
}

async function createProduct(request, response) {
  try {
    const {
      slug,
      title,
      mainImage,
      description,
      manufacturer,
      categoryId,
      variants,
    } = request.body;
    console.log(request.body.variants);
    if (!Array.isArray(variants) || variants.length === 0) {
      return response
        .status(400)
        .json({ error: "Product variants are required" });
    }

    // Validate each variant
    for (const element of variants) {
      if (!element.name) {
        return response
          .status(400)
          .json({ error: "Name field is required in variant" });
      }
      if (element.price === undefined || element.price === null) {
        return response
          .status(400)
          .json({ error: "Price field is required in variant" });
      }
      if (element.inStock === undefined || element.inStock === null) {
        return response
          .status(400)
          .json({ error: "inStock field is required in variant" });
      }
    }

    const product = await prisma.product.create({
      data: {
        slug,
        title,
        mainImage,
        rating: 5,
        description,
        manufacturer,
        categoryId,
      },
    });

    const createdVariants = await prisma.productVariant.createMany({
      data: variants.map((variant) => ({
        productId: product.id,
        name: variant.name,
        price: variant.price,
        inStock: variant.inStock,
      })),
    });
    const productWithVariants = await prisma.product.findUnique({
      where: {
        id: product.id,
      },
      include: {
        variants: true,
      },
    });

    return response.status(201).json(productWithVariants);
  } catch (error) {
    console.error("Error creating product:", error); // Dodajemo log za proveru
    return response.status(500).json({ error: "Error creating product" });
  }
}

// Method for updating existing product
async function updateProduct(request, response) {
  try {
    const { id } = request.params; // Getting a slug from params
    const {
      slug,
      title,
      mainImage,
      rating,
      description,
      manufacturer,
      categoryId,
      variants,
    } = request.body;
    // check variant
    if (!Array.isArray(variants) || variants.length === 0) {
      return response
        .status(400)
        .json({ error: "Product variants are required" });
    }

    // Validate each variant
    for (const element of variants) {
      if (!element.name) {
        return response
          .status(400)
          .json({ error: "Name field is required in variant" });
      }
      if (element.price === undefined || element.price === null) {
        return response
          .status(400)
          .json({ error: "Price field is required in variant" });
      }
      if (element.inStock === undefined || element.inStock === null) {
        return response
          .status(400)
          .json({ error: "inStock field is required in variant" });
      }
    }
    // Finding a product by slug
    const existingProduct = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!existingProduct) {
      return response.status(404).json({ error: "Product not found" });
    }

    // Updating found product
    const updatedProduct = await prisma.product.update({
      where: {
        id, // Using id of the found product
      },
      data: {
        title: title,
        mainImage: mainImage,
        slug: slug,
        rating: rating,
        description: description,
        manufacturer: manufacturer,
        categoryId: categoryId,
      },
    });

    // Delete existing variants that are not in the new variants array
    const existingVariants = await prisma.productVariant.findMany({
      where: {
        productId: id,
      },
    });

    // Delete variants that are not in the updated list
    for (const existingVariant of existingVariants) {
      const stillExists = variants.some((v) => v.id === existingVariant.id);
      if (!stillExists) {
        await prisma.productVariant.delete({
          where: {
            id: existingVariant.id,
          },
        });
      }
    }

    // Update or create variants
    for (const variant of variants) {
      if (variant.id) {
        // Update existing variant
        await prisma.productVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            name: variant.name,
            price: variant.price,
            inStock: variant.inStock,
            productId: id,
          },
        });
      } else {
        // Create new variant
        await prisma.productVariant.create({
          data: {
            name: variant.name,
            price: variant.price,
            inStock: variant.inStock,
            productId: id,
          },
        });
      }
    }
    // Retrieve the updated product with its variants
    const updatedProduct2 = await prisma.product.findUnique({
      where: {
        id: id,
      },
      include: {
        variants: true,
      },
    });
    return response.status(200).json(updatedProduct2);
  } catch (error) {
    return response
      .status(500)
      .json({ error: "Error updating product", errorLog: error.message });
  }
}

// Method for deleting a product
async function deleteProduct(request, response) {
  try {
    const { id } = request.params;

    // Find all variants associated with the product
    const productVariants = await prisma.productVariant.findMany({
      where: {
        productId: id,
      },
    });

    // Check for related records in customer_order_product for each variant
    for (const variant of productVariants) {
      const relatedOrderProductItems =
        await prisma.customer_order_product.findMany({
          where: {
            productVariantId: variant.id,
          },
        });

      if (relatedOrderProductItems.length > 0) {
        return response.status(400).json({
          error: `Cannot delete product because variant '${variant.name}' is referenced in customer orders.`,
        });
      }

      // Check for related records in Wishlist for each variant
      const relatedWishlistItems = await prisma.wishlist.findMany({
        where: {
          productVariantId: variant.id,
        },
      });

      if (relatedWishlistItems.length > 0) {
        return response.status(400).json({
          error: `Cannot delete product because variant '${variant.name}' is referenced in wishlists.`,
        });
      }
    }

    // Delete the product (cascading delete will handle ProductVariant due to onDelete: Cascade)
    await prisma.product.delete({
      where: {
        id,
      },
    });

    return response.status(204).send();
  } catch (error) {
    console.error("Error deleting product:", error);
    return response.status(500).json({ error: "Error deleting product" });
  }
}

async function searchProducts(request, response) {
  try {
    const { query } = request.query;
    if (!query) {
      return response
        .status(400)
        .json({ error: "Query parameter is required" });
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query,
            },
          },
          {
            description: {
              contains: query,
            },
          },
        ],
      },
    });

    return response.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    return response.status(500).json({ error: "Error searching products" });
  }
}

async function getProductById(request, response) {
  const { id } = request.params;
  const product = await prisma.product.findUnique({
    where: {
      id: id,
    },
    include: {
      category: true,
      variants: true,
    },
  });
  if (!product) {
    return response.status(404).json({ error: "Product not found" });
  }
  return response.status(200).json(product);
}

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductById,
};
