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
  const { rating, comment, productId } = request.body;
  // Ambil userId dari request.user yang diset oleh middleware authenticateUser
  const userId = request.user.id;

  // Validasi
  if (!rating || !comment || !productId) {
    throw new AppError("Rating, comment, and productId are required", 400);
  }

  if (rating < 1 || rating > 5) {
    throw new AppError("Rating must be between 1 and 5", 400);
  }

  if (comment.trim().length < 10) {
    throw new AppError("Comment must be at least 10 characters long", 400);
  }

  if (comment.length > 500) {
    throw new AppError("Comment must not exceed 500 characters", 400);
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw new AppError("Product not found", 404);
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
    throw new AppError("You have already reviewed this product. Use update instead.", 400);
  }

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
  
  // Update product average rating
  await updateProductRating(productId);

  return response.status(201).json({
    message: "Review created successfully",
    review
  });
});

// Update review
const updateReview = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const { rating, comment } = request.body;
  // Ambil userId dari request.user yang diset oleh middleware authenticateUser
  const userId = request.user.id;

  if (!id) {
    throw new AppError("Review ID is required", 400);
  }

  if (!rating || !comment) {
    throw new AppError("Rating and comment are required", 400);
  }

  if (rating < 1 || rating > 5) {
    throw new AppError("Rating must be between 1 and 5", 400);
  }

  if (comment.trim().length < 10) {
    throw new AppError("Comment must be at least 10 characters long", 400);
  }

  if (comment.length > 500) {
    throw new AppError("Comment must not exceed 500 characters", 400);
  }

  // Find existing review
  const existingReview = await prisma.review.findUnique({
    where: { id }
  });

  if (!existingReview) {
    throw new AppError("Review not found", 404);
  }

  // Check if user owns this review or is admin
  if (existingReview.userId !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || user.role !== 'admin') {
      throw new AppError("You can only update your own reviews", 403);
    }
  }

  // Update review
  const review = await prisma.review.update({
    where: { id },
    data: {
      rating: parseInt(rating),
      comment: comment.trim(),
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

  // Update product average rating
  await updateProductRating(existingReview.productId);

  return response.status(200).json({
    message: "Review updated successfully",
    review
  });
});

// Delete review
const deleteReview = asyncHandler(async (request, response) => {
  const { id } = request.params;
  // Ambil userId dari request.user yang diset oleh middleware authenticateUser
  const userId = request.user.id;

  if (!id) {
    throw new AppError("Review ID is required", 400);
  }

  // Find existing review
  const existingReview = await prisma.review.findUnique({
    where: { id }
  });

  if (!existingReview) {
    throw new AppError("Review not found", 404);
  }

  // Check if user owns this review or is admin
  if (existingReview.userId !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || user.role !== 'admin') {
      throw new AppError("You can only delete your own reviews", 403);
    }
  }

  // Delete review
  await prisma.review.delete({
    where: { id }
  });

  // Update product average rating
  await updateProductRating(existingReview.productId);

  return response.status(204).send();
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