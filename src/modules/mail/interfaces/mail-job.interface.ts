export interface ResetPasswordJobData {
  to: string;
  resetUrl: string;
}
export interface VerifyEmailJobData {
  to: string;
  verifyUrl: string;
}
export interface OrderConfirmationJobData {
  to: string;
  orderNumber: string;
  total: number;
  orderUrl: string;
}
export interface OrderStatusUpdateJobData {
  to: string;
  orderNumber: string;
  status: string;
  orderUrl: string;
}
