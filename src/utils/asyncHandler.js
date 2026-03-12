/**
 * Async handler wrapper to eliminate try-catch blocks in controllers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;

