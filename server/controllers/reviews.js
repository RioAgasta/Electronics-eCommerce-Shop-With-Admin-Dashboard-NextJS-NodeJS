const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { asyncHandler, AppError } = require("../utills/errorHandler");

// Get all reviews (mainly for admin)
const getAllReviews = asyncHandler(async (request, response) => {
  const { page = 1, limit = 10, productId, rating } = request.query;
  
  const skip = (page - 1) * limit;
  const where = {};
  
  if (productId) {
    where.productId = productId;
  }
  
  if (rating) {
    where.rating = parseInt(rating);
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true }
        },
        product: {
          select: { id: true, title: true, mainImage: true, slug: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    }),
    prisma.review.count({ where })
  ]);
  
  return response.status(200).json({
    reviews,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: total
    }
  });
});

// Get reviews by product ID
const getReviewsByProduct = asyncHandler(async (request, response) => {
  const { productId } = request.params;
  const { page = 1, limit = 10, rating } = request.query;
  
  if (!productId) {
    throw new AppError("Product ID is required", 400);
  }

  const skip = (page - 1) * limit;
  const where = { productId };
  
  if (rating) {
    where.rating = parseInt(rating);
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    }),
    prisma.review.count({ where })
  ]);
  
  return response.status(200).json({
    reviews,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: total
    }
  });
});

// Get reviews by user ID
const getReviewsByUser = asyncHandler(async (request, response) => {
  const { userId } = request.params;
  const { page = 1, limit = 10 } = request.query;
  
  if (!userId) {
    throw new AppError("User ID is required", 400);
  }

  const skip = (page - 1) * limit;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      include: {
        product: {
          select: { id: true, title: true, mainImage: true, slug: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    }),
    prisma.review.count({ where: { userId } })
  ]);
  
  return response.status(200).json({
    reviews,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: total
    }
  });
});

// Get single review by ID
const getReviewById = asyncHandler(async (request, response) => {
  const { id } = request.params;

  if (!id) {
    throw new AppError("Review ID is required", 400);
  }

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true }
      },
      product: {
        select: { id: true, title: true, mainImage: true, slug: true }
      }
    }
  });

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  return response.status(200).json(review);
});

// Get user's review for specific product
const getUserReviewForProduct = asyncHandler(async (request, response) => {
  const { userId, productId } = request.params;

  if (!userId || !productId) {
    throw new AppError("User ID and Product ID are required", 400);
  }

  const review = await prisma.review.findUnique({
    where: {
      productId_userId: {
        productId,
        userId
      }
    },
    include: {
      product: {
        select: { id: true, title: true, mainImage: true, slug: true }
      }
    }
  });

  return response.status(200).json(review);
});

// Create new review
const createReview = asyncHandler(async (request, response) => {
  try {
    console.log("=== REVIEW CREATION REQUEST ===");
    console.log("Request body:", JSON.stringify(request.body, null, 2));
    
    const { userId, productId, rating, comment } = request.body;

    // Validate request body 
    if (!request.body || typeof request.body !== 'object') {
      console.log("❌ Invalid request body");
      return response.status(400).json({ 
        error: "Invalid request body",
        details: "Request body must be a valid JSON object"
      });
    }

    // Validasi input required
    if (!userId || !productId || !rating || !comment) {
      console.log("❌ Missing required fields");
      return response.status(400).json({
        error: "Validation failed",
        details: [
          { field: 'userId', message: 'User ID is required' },
          { field: 'productId', message: 'Product ID is required' },
          { field: 'rating', message: 'Rating is required' },
          { field: 'comment', message: 'Comment is required' }
        ]
      });
    }

    // Validasi rating
    if (rating < 1 || rating > 5) {
      console.log("❌ Invalid rating");
      return response.status(400).json({
        error: "Invalid rating",
        details: [{ field: 'rating', message: 'Rating must be between 1 and 5' }]
      });
    }

    // Validasi comment length
    if (comment.trim().length < 10 || comment.length > 500) {
      console.log("❌ Invalid comment length");
      return response.status(400).json({
        error: "Invalid comment",
        details: [{ field: 'comment', message: 'Comment must be between 10 and 500 characters' }]
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      console.log("❌ Product not found");
      return response.status(404).json({
        error: "Product not found",
        details: "The specified product does not exist"
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log("❌ User not found");
      return response.status(404).json({
        error: "User not found",
        details: "The specified user does not exist"
      });
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId
        }
      }
    });

    if (existingReview) {
      console.log("❌ Review already exists");
      return response.status(409).json({
        error: "Review already exists",
        details: "You have already reviewed this product. Use update instead."
      });
    }

    console.log("Creating review in database...");
    // Create review
    const review = await prisma.review.create({
      data: {
        rating: parseInt(rating),
        comment: comment.trim(),
        productId,
        userId
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        product: {
          select: { id: true, title: true, mainImage: true, slug: true }
        }
      }
    });

    console.log("✅ Review created successfully:", review);

    // Update product average rating
    await updateProductRating(productId);

    const responseData = {
      id: review.id,
      message: "Review created successfully",
      review
    };

    console.log("Sending response:", responseData);
    return response.status(201).json(responseData);

  } catch (error) {
    console.error("❌ Error creating review:", error);
    
    // Handle specific Prisma errors (ikuti pola customer_orders.js)
    if (error.code === 'P2002') {
      return response.status(409).json({ 
        error: "Review conflict",
        details: "A review with this information already exists"
      });
    }

    // Generic error response
    return response.status(500).json({ 
      error: "Internal server error",
      details: "Failed to create review. Please try again later."
    });
  }
});



// Update review
const updateReview = asyncHandler(async (request, response) => {
  try {
    const { id } = request.params;
    const { userId, rating, comment } = request.body;

    // Validate ID format 
    if (!id || typeof id !== 'string') {
      return response.status(400).json({
        error: "Invalid review ID",
        details: "Review ID must be provided"
      });
    }

    // Validate request body
    if (!request.body || typeof request.body !== 'object') {
      return response.status(400).json({ 
        error: "Invalid request body",
        details: "Request body must be a valid JSON object"
      });
    }

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: { id }
    });

    if (!existingReview) {
      return response.status(404).json({ 
        error: "Review not found",
        details: "The specified review does not exist"
      });
    }

    // Check ownership atau admin (opsional, bisa skip jika mau full open)
    if (userId && existingReview.userId !== userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user || user.role !== 'admin') {
        return response.status(403).json({
          error: "Not authorized",
          details: "You can only update your own reviews"
        });
      }
    }

    // Validasi rating jika diberikan
    if (rating && (rating < 1 || rating > 5)) {
      return response.status(400).json({
        error: "Invalid rating",
        details: [{ field: 'rating', message: 'Rating must be between 1 and 5' }]
      });
    }

    // Validasi comment jika diberikan
    if (comment && (comment.trim().length < 10 || comment.length > 500)) {
      return response.status(400).json({
        error: "Invalid comment",
        details: [{ field: 'comment', message: 'Comment must be between 10 and 500 characters' }]
      });
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        rating: rating ? parseInt(rating) : existingReview.rating,
        comment: comment ? comment.trim() : existingReview.comment,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        product: {
          select: { id: true, title: true, mainImage: true, slug: true }
        }
      }
    });

    console.log(`Review updated successfully: ID ${updatedReview.id}`);

    // Update product average rating
    await updateProductRating(existingReview.productId);

    return response.status(200).json({
      message: "Review updated successfully",
      review: updatedReview
    });

  } catch (error) {
    console.error("Error updating review:", error);
    
    if (error.code === 'P2025') {
      return response.status(404).json({ 
        error: "Review not found",
        details: "The specified review does not exist"
      });
    }

    return response.status(500).json({ 
      error: "Internal server error",
      details: "Failed to update review. Please try again later."
    });
  }
});


// Delete review
const deleteReview = asyncHandler(async (request, response) => {
  try {
    const { id } = request.params;
    const { userId } = request.query; // Opsional untuk validasi ownership

    if (!id || typeof id !== 'string') {
      return response.status(400).json({
        error: "Invalid review ID",
        details: "Review ID must be provided"
      });
    }

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: { id }
    });

    if (!existingReview) {
      return response.status(404).json({ 
        error: "Review not found",
        details: "The specified review does not exist"
      });
    }

    // Check ownership atau admin (opsional)
    if (userId && existingReview.userId !== userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user || user.role !== 'admin') {
        return response.status(403).json({
          error: "Not authorized",
          details: "You can only delete your own reviews"
        });
      }
    }

    // Delete review
    await prisma.review.delete({
      where: { id }
    });

    console.log(`Review deleted successfully: ID ${id}`);

    // Update product average rating
    await updateProductRating(existingReview.productId);

    return response.status(204).send();

  } catch (error) {
    console.error("Error deleting review:", error);
    
    if (error.code === 'P2025') {
      return response.status(404).json({ 
        error: "Review not found",
        details: "The specified review does not exist"
      });
    }

    return response.status(500).json({ 
      error: "Internal server error",
      details: "Failed to delete review. Please try again later."
    });
  }
});


// Helper function to update product average rating
const updateProductRating = async (productId) => {
  const reviews = await prisma.review.findMany({
    where: { productId },
    select: { rating: true }
  });

  const averageRating = reviews.length > 0 
    ? Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length)
    : 0;

  await prisma.product.update({
    where: { id: productId },
    data: { rating: averageRating }
  });
};

module.exports = {
  getAllReviews,
  getReviewsByProduct,
  getReviewsByUser,
  createReview,
  updateReview,
  deleteReview,
  getReviewById,
  getUserReviewForProduct
};