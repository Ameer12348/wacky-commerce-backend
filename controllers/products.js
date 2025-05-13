const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getAllProducts(request, response) {
  const mode = request.query.mode || "";
  // checking if we are on the admin products page because we don't want to have filtering, sorting and pagination there
  if (mode === "admin") {
    try {
      const adminProducts = await prisma.product.findMany({});
      return response.json(adminProducts);
    } catch (error) {
      return response.status(500).json({ error: "Error fetching products" });
    }
  } else {
    const dividerLocation = request.url.indexOf("?");
    let filterObj = {};
    let sortObj = {};
    let sortByValue = "defaultSort";

    // getting current page
    const page = Number(request.query.page) ? Number(request.query.page) : 1;

    if (dividerLocation !== -1) {
      const queryArray = request.url
        .substring(dividerLocation + 1, request.url.length)
        .split("&");

      let filterType;
      let filterArray = [];

      for (let i = 0; i < queryArray.length; i++) {
        // checking whether it is filter mode or price filter
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("price") !== -1
        ) {
          // taking price par. Of course I could write it much simpler: filterType="price"
          filterType = queryArray[i].substring(
            queryArray[i].indexOf("price"),
            queryArray[i].indexOf("price") + "price".length
          );
        }

        // checking whether it is filter mode and rating filter
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("rating") !== -1
        ) {
          // taking "rating" part. Of course I could write it much simpler: filterType="rating"
          filterType = queryArray[i].substring(
            queryArray[i].indexOf("rating"),
            queryArray[i].indexOf("rating") + "rating".length
          );
        }

        // checking whether it is filter mode and category filter
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("category") !== -1
        ) {
          // getting "category" part
          filterType = "category";
        }

        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("inStock") !== -1
        ) {
          // getting "inStock" part.  Of course I could write it much simpler: filterType="inStock"
          filterType = queryArray[i].substring(
            queryArray[i].indexOf("inStock"),
            queryArray[i].indexOf("inStock") + "inStock".length
          );
        }

        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("outOfStock") !== -1
        ) {
          // getting "outOfStock" part.  Of course I could write it much simpler: filterType="outOfStock"
          filterType = queryArray[i].substring(
            queryArray[i].indexOf("outOfStock"),
            queryArray[i].indexOf("outOfStock") + "outOfStock".length
          );
        }

        if (queryArray[i].indexOf("sort") !== -1) {
          // getting sort value from the query
          sortByValue = queryArray[i].substring(queryArray[i].indexOf("=") + 1);
        }

        // checking whether in the given query filters mode is on
        if (queryArray[i].indexOf("filters") !== -1) {
          let filterValue;
          // checking that it is not filter by category. I am doing it so I can avoid converting string to number
          if (queryArray[i].indexOf("category") === -1) {
            // taking value part. It is the part where number value of the query is located and I am converting it to the number type because it is string by default
            filterValue = parseInt(
              queryArray[i].substring(
                queryArray[i].indexOf("=") + 1,
                queryArray[i].length
              )
            );
          } else {
            // if it is filter by category
            filterValue = queryArray[i].substring(
              queryArray[i].indexOf("=") + 1,
              queryArray[i].length
            );
          }

          // getting operator for example: lte, gte, gt, lt....
          const filterOperator = queryArray[i].substring(
            queryArray[i].indexOf("$") + 1,
            queryArray[i].indexOf("=") - 1
          );

          // All of it I add to the filterArray
          // example for current state of filterArray:
          /*
                  [
                  { filterType: 'price', filterOperator: 'lte', filterValue: 3000 },
                  { filterType: 'rating', filterOperator: 'gte', filterValue: 0 }
                  ]
                  */
          filterArray.push({ filterType, filterOperator, filterValue });
        }
      }
      for (let item of filterArray) {
        filterObj = {
          ...filterObj,
          [item.filterType]: {
            [item.filterOperator]: item.filterValue,
          },
        };
      }
    }

    let whereClause = { ...filterObj }; // Include other filters if any

    // Remove category filter from whereClause and use it separately
    if (filterObj.category && filterObj.category.equals) {
      delete whereClause.category; // Remove category filter from whereClause
    }

    if (sortByValue === "defaultSort") {
      sortObj = {};
    } else if (sortByValue === "titleAsc") {
      sortObj = {
        title: "asc",
      };
    } else if (sortByValue === "titleDesc") {
      sortObj = {
        title: "desc",
      };
    } else if (sortByValue === "lowPrice") {
      sortObj = {
        price: "asc",
      };
    } else if (sortByValue === "highPrice") {
      sortObj = {
        price: "desc",
      };
    }

    let products;

    if (Object.keys(filterObj).length === 0) {
      products = await prisma.product.findMany({
        // this is formula for pagination: (page - 1) * limit(take)
        skip: (page - 1) * 10,
        take: 12,
        include: {
          category: {
            select: {
              name: true,
            },
          },
          variants: true,
        },
        orderBy: sortObj,
      });
    } else {
      // Check if category filter is present
      if (filterObj.category && filterObj.category.equals) {
        products = await prisma.product.findMany({
          // this is formula for pagination: (page - 1) * limit(take)
          skip: (page - 1) * 10,
          take: 12,
          include: {
            category: {
              select: {
                name: true,
              },
            },
            variants: true,
          },
          where: {
            ...whereClause,
            category: {
              name: {
                equals: filterObj.category.equals,
              },
            },
          },
          orderBy: sortObj,
        });
      } else {
        // If no category filter, use whereClause
        products = await prisma.product.findMany({
          // this is formula for pagination: (page - 1) * limit(take)
          skip: (page - 1) * 10,
          take: 12,
          include: {
            category: {
              select: {
                name: true,
              },
            },
            variants: true,
          },
          where: whereClause,
          orderBy: sortObj,
        });
      }
    }

    return response.json(products);
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
