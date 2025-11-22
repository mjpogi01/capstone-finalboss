// RFC 5322 compliant email regex (strict validation)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Common disposable email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com',
  'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
  'mohmal.com', 'yopmail.com', 'sharklasers.com', 'trashmail.com',
  'fakeinbox.com', 'dispostable.com', 'mintemail.com', 'mytrashmail.com',
  'tempr.email', 'emailondeck.com', 'fake-box.com', 'getairmail.com',
  'mailnesia.com', 'spamgourmet.com', 'jetable.org', 'mailcatch.com'
];

/**
 * Validate email format using RFC 5322 compliant regex
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email format is valid
 */
export function validateEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmedEmail = email.trim().toLowerCase();

  // Check length (RFC 5321 limit)
  if (trimmedEmail.length > 254) {
    return false;
  }

  // Split email into local and domain parts
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  // Check local part length (RFC 5321 limit: 64 characters)
  if (localPart.length > 64 || localPart.length === 0) {
    return false;
  }

  // Check domain length
  if (domain.length > 253 || domain.length === 0) {
    return false;
  }

  // Validate format with regex
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return false;
  }

  // Additional checks
  // - Cannot start or end with dot
  if (localPart.startsWith('.') || localPart.endsWith('.') || 
      domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  // - Cannot have consecutive dots
  if (localPart.includes('..') || domain.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Check if domain is disposable email service
 * @param {string} domain - Email domain to check
 * @returns {boolean} - True if domain is disposable
 */
export function isDisposableEmail(domain) {
  if (!domain) return false;
  const normalizedDomain = domain.toLowerCase().trim();
  
  // Check against known disposable domains
  if (DISPOSABLE_EMAIL_DOMAINS.includes(normalizedDomain)) {
    return true;
  }

  // Check for common disposable patterns
  const disposablePatterns = [
    /^temp/i,
    /^trash/i,
    /^fake/i,
    /^throwaway/i,
    /^spam/i,
    /^mohmal/i,
    /^10min/i
  ];

  return disposablePatterns.some(pattern => pattern.test(normalizedDomain));
}

/**
 * Quick format-only validation (synchronous, for frontend use)
 * @param {string} email - Email address to validate
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function quickValidateEmail(email) {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email address is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!validateEmailFormat(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }

  const [, domain] = trimmedEmail.split('@');

  if (isDisposableEmail(domain)) {
    return { valid: false, error: 'Disposable email addresses are not allowed' };
  }

  return { valid: true };
}

/**
 * Validate email using backend API (includes domain existence check)
 * @param {string} email - Email address to validate
 * @returns {Promise<{valid: boolean, errors: string[], warnings?: string[]}>}
 */
export async function validateEmailWithBackend(email) {
  const { API_URL } = require('../config/api');
  
  try {
    const endpoint = `${API_URL}/api/auth/verification/validate-email`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Non-JSON responses (like HTML error pages) should not break parsing
      const rawText = await response.text();
      console.error('Unexpected response from email validation endpoint:', rawText);
      return {
        valid: false,
        errors: ['Email validation service returned an unexpected response. Please try again.'],
        warnings: []
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        errors: data.errors || [data.error || `Email validation failed (${response.status})`],
        warnings: data.warnings || []
      };
    }

    return data;
  } catch (error) {
    console.error('Error validating email:', error);
    // Fallback to frontend validation if backend fails
    const quickCheck = quickValidateEmail(email);
    return {
      valid: quickCheck.valid,
      errors: quickCheck.valid ? [] : [quickCheck.error],
      warnings: ['Could not verify domain (using format check only)']
    };
  }
}

