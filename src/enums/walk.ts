export enum WalkEvents {
  PENDING = 'pending',
  ACCEPTED_SUCCESSFULLY = 'accepted',
  INVALID_REQUEST = 'invalidRequest',
  SERVER_ERROR = 'serverError',
  PAYMENT_FAILURE = 'paymentFailure',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  REQUEST_DENIED = 'requestDenied',
  IN_PROGRESS = 'inProgress',
}
