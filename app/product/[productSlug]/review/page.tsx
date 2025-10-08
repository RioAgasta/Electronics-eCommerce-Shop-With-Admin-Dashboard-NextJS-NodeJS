// *********************
// Role of the component: Product review page
// Name of the component: ProductReviewPage
// Developer: GitHub Copilot
// Version: 1.0
// Component call: /product/[productSlug]/review
// Input parameters: { params: Promise<{ productSlug: string }> }
// Output: Product review form with star rating and text area
// *********************

'use client';
import { CustomButton, SectionTitle } from '@/components';
import apiClient from '@/lib/api';
import { sanitize } from '@/lib/sanitize';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';

interface ProductReviewPageProps {
	params: Promise<{ productSlug: string }>;
}

const ProductReviewPage = ({ params }: ProductReviewPageProps) => {
	const router = useRouter();
	const { data: session, status: sessionStatus } = useSession();
	const [user, setUser] = useState<User>();
	const [productSlug, setProductSlug] = useState<string>('');
	const [product, setProduct] = useState<any>(null);
	const [rating, setRating] = useState<number>(0);
	const [hoverRating, setHoverRating] = useState<number>(0);
	const [reviewText, setReviewText] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [error, setError] = useState<string>('');

	useEffect(() => {
		const getUserByEmail = async () => {
			try {
				if (session?.user?.email) {
					const data = await apiClient
						.get(`/api/users/email/${session?.user?.email}`, {
							cache: 'no-store',
						})
						.then((response) => response.json());

					setUser(data);
				}
			} catch (error) {
				console.error('Error fetching user:', error);
				setError('Failed to fetch user');
				toast.error('Failed to fetch user');
			}
		};

		getUserByEmail();
	}, [session?.user?.email]);

	useEffect(() => {
		const getParams = async () => {
			const resolvedParams = await params;
			setProductSlug(resolvedParams.productSlug);
		};
		getParams();
	}, [params]);

	useEffect(() => {
		// Redirect to login if not authenticated
		if (sessionStatus === 'unauthenticated') {
			router.push('/login?redirect=/product/' + productSlug + '/review');
			return;
		}

		// Fetch product data
		const fetchProduct = async () => {
			if (!productSlug) return;

			try {
				setIsLoading(true);
				const response = await apiClient.get(`/api/slugs/${productSlug}`);
				const productData = await response.json();

				if (productData && !productData.error) {
					setProduct(productData);
				} else {
					setError('Product not found');
					toast.error('Product not found');
				}
			} catch (error) {
				console.error('Error fetching product:', error);
				setError('Failed to load product');
				toast.error('Failed to load product');
			} finally {
				setIsLoading(false);
			}
		};

		if (sessionStatus === 'authenticated' && productSlug) {
			fetchProduct();
		}
	}, [sessionStatus, productSlug, router]);

	const handleStarClick = (starIndex: number) => {
		setRating(starIndex + 1);
	};

	const handleStarHover = (starIndex: number) => {
		setHoverRating(starIndex + 1);
	};

	const handleStarLeave = () => {
		setHoverRating(0);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!session?.user?.email) {
			toast.error('You must be logged in to submit a review');
			return;
		}

		if (rating === 0) {
			setError('Please select a star rating');
			toast.error('Please select a star rating');
			return;
		}

		if (reviewText.trim().length < 10) {
			setError('Review must be at least 10 characters long');
			toast.error('Review must be at least 10 characters long');
			return;
		}

		if (reviewText.trim().length > 1000) {
			setError('Review must be less than 1000 characters');
			toast.error('Review must be less than 1000 characters');
			return;
		}

		setIsSubmitting(true);
		setError('');

		try {
      const response = await apiClient.post(`/api/reviews`, {
        userId: user?.id,
        productId: product.id,
        rating: rating,
        comment: reviewText.trim(),
      });

			const data = await response.json();

			if (response.ok) {
				toast.success('Review submitted successfully!');
				router.push(`/product/${productSlug}`);
			} else {
				setError(data.error || 'Failed to submit review');
				toast.error(data.error || 'Failed to submit review');
			}
		} catch (error) {
			console.error('Error submitting review:', error);
			setError('Failed to submit review. Please try again.');
			toast.error('Failed to submit review. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (sessionStatus === 'loading' || isLoading) {
		return (
			<div className="bg-white min-h-screen flex items-center justify-center">
				<h1 className="text-2xl text-gray-900">Loading...</h1>
			</div>
		);
	}

	if (error && !product) {
		return (
			<div className="bg-white">
				<SectionTitle
					title="Review Product"
					path="Home | Product | Review"
				/>
				<div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-white">
					<div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
						<h2 className="text-2xl font-medium text-red-600 mb-4">Error</h2>
						<p className="text-gray-600 mb-6">{error}</p>
						<Link
							href="/shop"
							className="text-blue-600 hover:text-blue-800 underline">
							Return to Shop
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white">
			<SectionTitle
				title="Write a Review"
				path={`Home | Product | ${
					product?.title ? sanitize(product.title) : 'Product'
				} | Review`}
			/>

			<div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-white">
				<div className="sm:mx-auto sm:w-full sm:max-w-md">
					<h2 className="mt-6 text-center text-2xl font-normal leading-9 tracking-tight text-gray-900">
						Review: {product?.title ? sanitize(product.title) : 'Product'}
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Share your experience with this product
					</p>
				</div>

				<div className="mt-5 sm:mx-auto sm:w-full sm:max-w-[480px]">
					<div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
						<form
							className="space-y-6"
							onSubmit={handleSubmit}>
							{/* Star Rating Section */}
							<div>
								<label className="block text-sm font-medium leading-6 text-gray-900 mb-3">
									Rating *
								</label>
								<div className="flex items-center space-x-1">
									{[0, 1, 2, 3, 4].map((starIndex) => {
										const isFilled = starIndex < (hoverRating || rating);
										return (
											<button
												key={starIndex}
												type="button"
												className="focus:outline-none transition-colors duration-200"
												onClick={() => handleStarClick(starIndex)}
												onMouseEnter={() => handleStarHover(starIndex)}
												onMouseLeave={handleStarLeave}>
												{isFilled ? (
													<AiFillStar className="text-yellow-400 text-3xl hover:text-yellow-500" />
												) : (
													<AiOutlineStar className="text-yellow-400 text-3xl hover:text-yellow-500" />
												)}
											</button>
										);
									})}
									<span className="ml-3 text-sm text-gray-600">
										{rating > 0 && `${rating} star${rating !== 1 ? 's' : ''}`}
									</span>
								</div>
							</div>

							{/* Review Text Section */}
							<div>
								<label
									htmlFor="reviewText"
									className="block text-sm font-medium leading-6 text-gray-900">
									Your Review *
								</label>
								<div className="mt-2">
									<textarea
										id="reviewText"
										name="reviewText"
										rows={6}
										value={reviewText}
										onChange={(e) => setReviewText(e.target.value)}
										placeholder="Share your thoughts about this product..."
										required
										className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 resize-vertical"
									/>
									<div className="mt-1 flex justify-between text-xs text-gray-500">
										<span>Minimum 10 characters</span>
										<span>{reviewText.length}/1000</span>
									</div>
								</div>
							</div>

							{/* Error Message */}
							{error && (
								<div className="rounded-md bg-red-50 p-4">
									<div className="text-sm text-red-700">{error}</div>
								</div>
							)}

							{/* Submit Button */}
							<div className="flex gap-4">
								<CustomButton
									buttonType="submit"
									text={isSubmitting ? 'Submitting...' : 'Submit Review'}
									paddingX={6}
									paddingY={3}
									customWidth="full"
									textSize="sm"
								/>
							</div>

							{/* Cancel Link */}
							<div className="text-center">
								<Link
									href={`/product/${productSlug}`}
									className="text-sm text-gray-600 hover:text-gray-800 underline">
									Cancel and return to product
								</Link>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProductReviewPage;
