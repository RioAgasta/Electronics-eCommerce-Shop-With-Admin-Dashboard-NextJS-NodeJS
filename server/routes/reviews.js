const express = require('express');
const router = express.Router();


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
  .post(createReview); 

router.route('/:id')
  .get(getReviewById)
  .put(updateReview) 
  .delete(deleteReview); 

module.exports = router;