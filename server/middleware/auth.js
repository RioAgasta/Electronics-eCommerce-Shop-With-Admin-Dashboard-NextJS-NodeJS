const jwt = require('jsonwebtoken');
const { asyncHandler, AppError } = require('../utills/errorHandler');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Authentication middleware
const authenticateUser = asyncHandler(async (req, res, next) => {
  // Check if authorization header exists
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication invalid', 401);
  }

  // Get token from header
  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    
    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      throw new AppError('User not found', 401);
    }
    
    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    throw new AppError('Authentication invalid', 401);
  }
});

// Admin authorization middleware
const authorizeAdmin = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Not authorized to access this route', 403);
  }
  next();
});

module.exports = {
  authenticateUser,
  authorizeAdmin
};