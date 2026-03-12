/**
 * Escape special characters in regex
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export default {
  escapeRegex,
};

