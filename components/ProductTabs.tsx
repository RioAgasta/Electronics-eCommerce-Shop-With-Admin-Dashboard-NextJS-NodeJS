// *********************
// Role of the component: Single product tabs on the single product page containing product description, main product info and reviews
// Name of the component: ProductTabs.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <ProductTabs product={product} />
// Input parameters: { product: Product }
// Output: Single product tabs containing product description, main product info and reviews
// *********************

"use client";

import React, { useState, useEffect } from "react";
import RatingPercentElement from "./RatingPercentElement";
import SingleReview from "./SingleReview";
import { formatCategoryName } from "@/utils/categoryFormating";
import { sanitize, sanitizeHtml } from "@/lib/sanitize";
import apiClient from "@/lib/api";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    current: number;
    total: number;
    count: number;
  };
}

const ProductTabs = ({ product }: { product: Product }) => {
  const [currentProductTab, setCurrentProductTab] = useState<number>(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Fetch reviews when Reviews tab is selected
  useEffect(() => {
    if (currentProductTab === 2 && product?.id && reviews.length === 0) {
      fetchReviews();
    }
  }, [currentProductTab, product?.id]);

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);

      const response = await apiClient.get(
        `/api/reviews/product/${product.id}`,
      );

      if (response.ok) {
        const data: ReviewsResponse = await response.json();
        setReviews(data.reviews);
      } else {
        setReviewsError("Failed to load reviews");
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviewsError("Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  };

  return (
    <div className="px-5 text-black">
      <div role="tablist" className="tabs tabs-bordered">
        <a
          role="tab"
          className={`tab text-lg text-black pb-8 max-[500px]:text-base max-[400px]:text-sm max-[370px]:text-xs ${
            currentProductTab === 0 && "tab-active"
          }`}
          onClick={() => setCurrentProductTab(0)}
        >
          Description
        </a>
        <a
          role="tab"
          className={`tab text-black text-lg pb-8 max-[500px]:text-base max-[400px]:text-sm max-[370px]:text-xs ${
            currentProductTab === 1 && "tab-active"
          }`}
          onClick={() => setCurrentProductTab(1)}
        >
          Additional info
        </a>
        <a
          role="tab"
          className={`tab text-black text-lg pb-8 max-[500px]:text-base max-[400px]:text-sm max-[370px]:text-xs ${
            currentProductTab === 2 && "tab-active"
          }`}
          onClick={() => setCurrentProductTab(2)}
        >
          Reviews
        </a>
      </div>
      <div className="pt-5">
        {currentProductTab === 0 && (
          <div
            className="text-lg max-sm:text-sm"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(product?.description),
            }}
          />
        )}

        {currentProductTab === 1 && (
          <div className="overflow-x-auto">
            <table className="table text-xl text-center max-[500px]:text-base">
              <tbody>
                {/* row 1 */}
                <tr>
                  <th>Manufacturer:</th>
                  <td>{sanitize(product?.manufacturer)}</td>
                </tr>
                {/* row 2 */}
                <tr>
                  <th>Category:</th>
                  <td>
                    {product?.category?.name
                      ? sanitize(formatCategoryName(product?.category?.name))
                      : "No category"}
                  </td>
                </tr>
                {/* row 3 */}
                <tr>
                  <th>Color:</th>
                  <td>Silver, LightSlateGray, Blue</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {currentProductTab === 2 && (
          <div className="max-w-4xl mx-auto">
            {reviewsLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-3 text-lg">Loading reviews...</span>
              </div>
            )}

            {reviewsError && (
              <div className="text-center py-12">
                <p className="text-red-600 text-lg">{reviewsError}</p>
                <button
                  onClick={fetchReviews}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              </div>
            )}

            {!reviewsLoading && !reviewsError && reviews.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  No reviews yet for this product.
                </p>
                <p className="text-gray-500 mt-2">
                  Be the first to write a review!
                </p>
              </div>
            )}

            {!reviewsLoading && !reviewsError && reviews.length > 0 && (
              <div className="space-y-6">
                <div className="border-b pb-4 mb-6">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    Customer Reviews ({reviews.length})
                  </h3>
                  <div className="flex items-center">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.round(product?.rating || 0)
                              ? "fill-current"
                              : "text-gray-300"
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="ml-2 text-gray-600">
                      {product?.rating ? product.rating.toFixed(1) : "0.0"} of 5
                    </span>
                  </div>
                </div>

                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="border-b border-gray-200 pb-6 last:border-b-0"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {review.user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {review.user.email.split("@")[0]}
                            </p>
                            <div className="flex items-center mt-1">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? "fill-current"
                                        : "text-gray-300"
                                    }`}
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="ml-2 text-sm text-gray-600">
                                {review.rating} of 5 stars
                              </span>
                            </div>
                          </div>
                          <time className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </time>
                        </div>
                        <div className="mt-3">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {sanitize(review.comment)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductTabs;
