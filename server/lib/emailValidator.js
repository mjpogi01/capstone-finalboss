const dns = require('dns').promises;
const net = require('net');
const { promisify } = require('util');

// RFC 5322 compliant email regex (strict validation)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Common disposable email domains (expand this list as needed)
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
function validateEmailFormat(email) {
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
function isDisposableEmail(domain) {
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
 * Check if email domain exists and has MX records
 * @param {string} domain - Email domain to check
 * @returns {Promise<{exists: boolean, hasMX: boolean, mxRecord?: string, error?: string}>}
 */
async function checkDomainExists(domain) {
  if (!domain) {
    return { exists: false, hasMX: false, error: 'Domain is required' };
  }

  try {
    // Check for MX records (mail exchange records)
    const mxRecords = await dns.resolveMx(domain);
    
    if (mxRecords && mxRecords.length > 0) {
      // Sort by priority (lower is better)
      mxRecords.sort((a, b) => a.priority - b.priority);
      return { exists: true, hasMX: true, mxRecord: mxRecords[0].exchange, mxRecords };
    }

    // If no MX records, check for A record (some servers use A record for mail)
    try {
      const aRecords = await dns.resolve4(domain);
      if (aRecords && aRecords.length > 0) {
        return { exists: true, hasMX: false, hasA: true, mxRecord: domain, mxRecords: [{ exchange: domain, priority: 10 }] };
      }
    } catch (aError) {
      // No A record either
    }

    return { exists: false, hasMX: false, error: 'No mail servers found for domain' };
  } catch (error) {
    // DNS lookup failed
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return { exists: false, hasMX: false, error: 'Domain does not exist' };
    }
    
    // Other DNS errors (timeout, network issues, etc.)
    console.warn(`⚠️ DNS lookup error for ${domain}:`, error.message);
    // Don't fail validation on DNS errors (could be temporary network issue)
    // But log it for monitoring
    return { exists: null, hasMX: false, error: error.message, dnsError: true };
  }
}

/**
 * Verify email address exists by checking with SMTP server
 * Uses RCPT TO command to check if email would be accepted
 * @param {string} email - Email address to verify
 * @param {string} mxHost - MX host to connect to
 * @returns {Promise<{exists: boolean, error?: string}>}
 */
async function verifyEmailWithSMTP(email, mxHost) {
  return new Promise((resolve) => {
    let socket = null;
    let data = '';
    let timeout = null;
    let state = 'connect'; // connect -> ehlo -> mailfrom -> rcptto -> done
    let ehloLinesReceived = 0;
    
    // Set timeout (15 seconds for SMTP verification)
    timeout = setTimeout(() => {
      if (socket) {
        socket.destroy();
      }
      resolve({ exists: null, error: 'SMTP verification timeout', timeout: true });
    }, 15000);

    try {
      // Connect to SMTP server (port 25)
      socket = net.createConnection(25, mxHost);

      socket.on('connect', () => {
        console.log(`🔌 Connected to SMTP server: ${mxHost}`);
        state = 'connect';
      });

      socket.on('data', (chunk) => {
        data += chunk.toString();
        const lines = data.split('\r\n');
        data = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const code = parseInt(line.substring(0, 3));
          if (isNaN(code)) continue;

          // Initial greeting (220)
          if (state === 'connect' && code === 220) {
            state = 'ehlo';
            socket.write(`EHLO ${mxHost}\r\n`);
            ehloLinesReceived = 0;
          }
          // EHLO response (250) - can be multi-line
          else if (state === 'ehlo' && code === 250) {
            ehloLinesReceived++;
            // Check if this is the last EHLO line (has space after code or ends line)
            // Format: "250-mx.server.com" (multi-line) or "250 OK" (last line)
            if (line[3] === ' ' || !line.includes('-')) {
              // Last EHLO line, send MAIL FROM
              state = 'mailfrom';
              socket.write(`MAIL FROM:<noreply@${mxHost}>\r\n`);
            }
            // Continue waiting for more EHLO lines
          }
          // MAIL FROM response (250)
          else if (state === 'mailfrom' && code === 250) {
            state = 'rcptto';
            // Send RCPT TO
            socket.write(`RCPT TO:<${email}>\r\n`);
          }
          // RCPT TO response - Email exists (250)
          else if (state === 'rcptto' && code === 250) {
            // Email exists (server accepted it)
            clearTimeout(timeout);
            socket.end();
            resolve({ exists: true });
            return;
          }
          // RCPT TO rejected (550, 551, 553, etc.) - Email doesn't exist
          else if (state === 'rcptto' && (code === 550 || code === 551 || code === 553 || code === 503)) {
            // Email doesn't exist or rejected
            clearTimeout(timeout);
            socket.end();
            
            if (code === 550) {
              resolve({ exists: false, error: 'Email address does not exist' });
            } else if (code === 551) {
              resolve({ exists: false, error: 'Email address not local' });
            } else if (code === 553) {
              resolve({ exists: false, error: 'Email address rejected' });
            } else {
              resolve({ exists: false, error: `SMTP error ${code}: ${line.substring(4)}` });
            }
            return;
          }
          // Other errors during RCPT TO
          else if (state === 'rcptto' && code >= 400) {
            clearTimeout(timeout);
            socket.end();
            
            if (code >= 400 && code < 500) {
              resolve({ exists: null, error: `SMTP temporary error ${code}: ${line.substring(4)}`, temporary: true });
            } else {
              resolve({ exists: null, error: `SMTP error ${code}: ${line.substring(4)}`, blocked: true });
            }
            return;
          }
          // Unexpected errors in other states
          else if (code >= 400 && code < 500) {
            clearTimeout(timeout);
            socket.end();
            resolve({ exists: null, error: `SMTP temporary error ${code}: ${line.substring(4)}`, temporary: true });
            return;
          }
          else if (code >= 500) {
            clearTimeout(timeout);
            socket.end();
            resolve({ exists: null, error: `SMTP error ${code}: ${line.substring(4)}`, blocked: true });
            return;
          }
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.warn(`⚠️ SMTP connection error for ${mxHost}:`, error.message);
        resolve({ exists: null, error: error.message, connectionError: true });
      });

      socket.on('close', () => {
        clearTimeout(timeout);
        // If we got here without resolving, the server closed connection
        if (!socket.destroyed) {
          resolve({ exists: null, error: 'SMTP connection closed unexpectedly' });
        }
      });

    } catch (error) {
      clearTimeout(timeout);
      if (socket) {
        socket.destroy();
      }
      console.warn(`⚠️ SMTP verification error for ${email}:`, error.message);
      resolve({ exists: null, error: error.message });
    }
  });
}

/**
 * Verify email address exists (SMTP check)
 * Tries multiple MX hosts if available
 * @param {string} email - Email address to verify
 * @param {Object} domainInfo - Domain info from checkDomainExists
 * @returns {Promise<{exists: boolean, error?: string}>}
 */
async function verifyEmailExists(email, domainInfo) {
  if (!domainInfo.mxRecords || domainInfo.mxRecords.length === 0) {
    return { exists: null, error: 'No mail servers available for verification' };
  }

  // Try first 3 MX records (sorted by priority)
  const mxRecordsToTry = domainInfo.mxRecords.slice(0, 3);
  
  for (const mxRecord of mxRecordsToTry) {
    const mxHost = mxRecord.exchange;
    console.log(`🔍 Verifying ${email} via SMTP server: ${mxHost}`);
    
    const result = await verifyEmailWithSMTP(email, mxHost);
    
    // If email definitely doesn't exist, return immediately
    if (result.exists === false) {
      return result;
    }
    
    // If email exists, return success
    if (result.exists === true) {
      return result;
    }
    
    // If blocked or connection error, try next MX
    if (result.blocked || result.connectionError) {
      console.log(`⚠️ SMTP verification blocked/error for ${mxHost}, trying next MX...`);
      continue;
    }
    
    // For temporary errors, try next MX
    if (result.temporary) {
      console.log(`⚠️ SMTP temporary error for ${mxHost}, trying next MX...`);
      continue;
    }
  }
  
  // If all MX hosts failed or blocked SMTP verification
  // Most modern mail servers block this for anti-spam reasons
  // So we'll allow it but log a warning
  console.warn(`⚠️ Could not verify email ${email} via SMTP (may be blocked by mail server)`);
  return { exists: null, error: 'SMTP verification unavailable (may be blocked by mail server)', smtpBlocked: true };
}

/**
 * Comprehensive email validation with SMTP verification
 * @param {string} email - Email address to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.checkDomain - Whether to check domain existence (default: true)
 * @param {boolean} options.verifyEmail - Whether to verify email exists via SMTP (default: true)
 * @param {boolean} options.allowDisposable - Whether to allow disposable emails (default: false)
 * @returns {Promise<{valid: boolean, errors: string[], warnings?: string[]}>}
 */
async function validateEmail(email, options = {}) {
  const {
    checkDomain = true,
    verifyEmail = true,
    allowDisposable = false
  } = options;

  const errors = [];
  const warnings = [];

  // 1. Format validation
  if (!validateEmailFormat(email)) {
    errors.push('Invalid email format');
    return { valid: false, errors };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [, domain] = normalizedEmail.split('@');

  // 2. Disposable email check
  if (!allowDisposable && isDisposableEmail(domain)) {
    errors.push('Disposable email addresses are not allowed');
    return { valid: false, errors };
  }

  // 3. Domain existence check
  let domainCheck = null;
  if (checkDomain) {
    domainCheck = await checkDomainExists(domain);
    
    if (domainCheck.exists === false) {
      errors.push('Email domain does not exist or is invalid');
      return { valid: false, errors };
    }

    if (domainCheck.dnsError) {
      // DNS error (network issue, timeout, etc.) - warn but don't fail
      warnings.push('Could not verify domain (this may be a temporary issue)');
    }

    if (!domainCheck.hasMX && !domainCheck.hasA) {
      errors.push('Email domain does not have mail servers configured');
      return { valid: false, errors };
    }
  }

  // 4. SMTP email verification (check if email actually exists)
  // Only reject if we definitively know the email doesn't exist
  // For all other cases (blocked, timeout, errors), allow the email
  // They'll need to verify via code anyway - if fake, they won't receive the code
  if (verifyEmail && domainCheck && domainCheck.exists) {
    console.log(`🔍 Starting SMTP verification for ${normalizedEmail}...`);
    const smtpVerification = await verifyEmailExists(normalizedEmail, domainCheck);
    
    if (smtpVerification.exists === false) {
      // Email definitely doesn't exist (SMTP 550 response) - REJECT
      console.log(`❌ Email does not exist: ${normalizedEmail}`);
      errors.push(smtpVerification.error || 'Email address does not exist');
      return { valid: false, errors };
    }
    
    if (smtpVerification.exists === true) {
      // Email exists - verified via SMTP!
      console.log(`✅ Email verified via SMTP: ${normalizedEmail}`);
    } else {
      // SMTP verification blocked, failed, or unavailable
      // This is common - most providers block SMTP verification for anti-spam
      // Allow the email to proceed - they'll verify via code
      // If it's fake, they won't receive the verification code anyway
      console.log(`⚠️ SMTP verification unavailable for ${normalizedEmail} (will verify via email code)`);
      // Don't add error or warning - just allow it through
      // The email verification code step will catch fake emails
    }
  }

  return { valid: true, errors: [], warnings };
}

/**
 * Quick format-only validation (synchronous, for frontend use)
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email format is valid
 */
function quickValidate(email) {
  return validateEmailFormat(email);
}

module.exports = {
  validateEmail,
  validateEmailFormat,
  isDisposableEmail,
  checkDomainExists,
  quickValidate,
  EMAIL_REGEX
};

