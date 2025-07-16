import { customAxios } from "@/components/config/axios";

// Get subscription plans
export const getSubscriptionPlans = async () => {
  return await customAxios.get("/payment/plans");
};

// Get user subscription status and AI usage
export const getUserSubscription = async () => {
  return await customAxios.get("/payment/subscription");
};

// Create Stripe checkout session
export const createCheckoutSession = async (plan) => {
  return await customAxios.post("/payment/create-checkout-session", { plan });
};

// Verify payment session
export const verifyPaymentSession = async (sessionId) => {
  return await customAxios.get(`/payment/verify-session/${sessionId}`);
};

// AI summary with subscription check
export const summarizeBlogWithSubscription = async (blogId) => {
  return await customAxios.get(`/blogs/summarize/${blogId}`);
};

// Get user transactions
export const getTransactions = async (page = 1, limit = 10) => {
  return await customAxios.get(`/payment/transactions?page=${page}&limit=${limit}`);
};

// Get single transaction details
export const getTransactionDetails = async (transactionId) => {
  return await customAxios.get(`/payment/transactions/${transactionId}`);
};

// Cancel subscription
export const cancelSubscription = async () => {
  return await customAxios.post("/payment/cancel-subscription");
};

// Admin endpoints
export const getAdminTransactions = async (queryString = '') => {
  return await customAxios.get(`/payment/admin/transactions?${queryString}`);
};

export const getAdminStats = async () => {
  return await customAxios.get("/payment/admin/stats");
};
