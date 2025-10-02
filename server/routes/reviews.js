const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middleware/auth');

const {
  getAllReviews,
  getReviewsByProduct,
  getReviewsByUser,
  createReview,
  updateReview,
  deleteReview,
  getReviewById,
  getUserReviewForProduct
} = require('../controllers/reviews');

// Public routes - Get reviews
router.route('/').get(getAllReviews);
router.route('/product/:productId').get(getReviewsByProduct);
router.route('/user/:userId').get(getReviewsByUser);
router.route('/user/:userId/product/:productId').get(getUserReviewForProduct);

router.route('/')
  .post(authenticateUser, createReview); 

router.route('/:id')
  .get(getReviewById)
  .put(authenticateUser, updateReview) 
  .delete(authenticateUser, deleteReview); 

module.exports = router;