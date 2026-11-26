/**
 * Standardized API response helper ensuring every endpoint returns
 * the exact C-Grade JSON envelope: { success, message, data, meta }.
 */
export class ApiResponse {
  /**
   * @param {boolean} success
   * @param {string} message
   * @param {unknown} data
   * @param {object | undefined} meta
   */
  constructor(success, message, data = null, meta = undefined) {
    this.success = success;
    this.message = message;
    this.data = data;
    if (meta !== undefined) {
      this.meta = meta;
    }
  }
}

/**
 * Sends a standardized JSON success response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {unknown} data
 * @param {object | undefined} meta
 */
export function sendSuccess(res, statusCode = 200, message = 'Success', data = null, meta = undefined) {
  return res.status(statusCode).json(new ApiResponse(true, message, data, meta));
}
