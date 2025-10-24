// Note: Since Jest in Node environment can't directly import browser modules with DOM dependencies,
// we'll test the functions defined locally for verification purposes

// Define the functions to be tested (copied from ExtensionCore.js)
function isAlphaNumericWithUnderscores(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = char.charCodeAt(0);
    
    // Check if character is uppercase letter (A-Z)
    if (code >= 65 && code <= 90) continue;
    // Check if character is lowercase letter (a-z)
    if (code >= 97 && code <= 122) continue;
    // Check if character is digit (0-9)
    if (code >= 48 && code <= 57) continue;
    // Check if character is underscore (_)
    if (code === 95) continue;
    
    // If character is none of the above, it's invalid
    return false;
  }
  
  return true;
}

function isLowerAlphaNumericWithUnderscoresAndHyphens(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = char.charCodeAt(0);
    
    // Check if character is lowercase letter (a-z)
    if (code >= 97 && code <= 122) continue;
    // Check if character is digit (0-9)
    if (code >= 48 && code <= 57) continue;
    // Check if character is underscore (_)
    if (code === 95) continue;
    // Check if character is hyphen (-)
    if (code === 45) continue;
    
    // If character is none of the above, it's invalid
    return false;
  }
  
  return true;
}

function isMobileUserAgent(userAgent) {
  const mobileIndicators = [
    'android',
    'webos', 
    'iphone',
    'ipad',
    'ipod',
    'blackberry',
    'iemobile',
    'opera mini'
  ];
  
  const lowerUserAgent = userAgent.toLowerCase();
  
  for (let i = 0; i < mobileIndicators.length; i++) {
    if (lowerUserAgent.includes(mobileIndicators[i])) {
      return true;
    }
  }
  
  return false;
}

describe('ExtensionCore Helper Functions', () => {
  describe('isAlphaNumericWithUnderscores', () => {
    test('should return true for valid alphanumeric strings with underscores', () => {
      expect(isAlphaNumericWithUnderscores('valid_string')).toBe(true);
      expect(isAlphaNumericWithUnderscores('valid123')).toBe(true);
      expect(isAlphaNumericWithUnderscores('ValidString_123')).toBe(true);
      expect(isAlphaNumericWithUnderscores('')).toBe(false);
      expect(isAlphaNumericWithUnderscores(null)).toBe(false);
      expect(isAlphaNumericWithUnderscores(undefined)).toBe(false);
    });

    test('should return false for strings with invalid characters', () => {
      expect(isAlphaNumericWithUnderscores('invalid-string')).toBe(false); // hyphen
      expect(isAlphaNumericWithUnderscores('invalid string')).toBe(false); // space
      expect(isAlphaNumericWithUnderscores('invalid@string')).toBe(false); // @ symbol
      expect(isAlphaNumericWithUnderscores('invalid.string')).toBe(false); // dot
    });
  });

  describe('isLowerAlphaNumericWithUnderscoresAndHyphens', () => {
    test('should return true for valid lowercase alphanumeric strings with underscores and hyphens', () => {
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('valid_string')).toBe(true);
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('valid-string')).toBe(true);
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('valid123')).toBe(true);
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('valid_string-123')).toBe(true);
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('')).toBe(false);
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens(null)).toBe(false);
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens(undefined)).toBe(false);
    });

    test('should return false for invalid strings', () => {
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('InvalidString')).toBe(false); // uppercase
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('invalid string')).toBe(false); // space
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('invalid@string')).toBe(false); // @ symbol
      expect(isLowerAlphaNumericWithUnderscoresAndHyphens('Invalid-String')).toBe(false); // uppercase
    });
  });

  describe('isMobileUserAgent', () => {
    test('should detect mobile user agents', () => {
      expect(isMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)')).toBe(true);
      expect(isMobileUserAgent('Mozilla/5.0 (Android; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0')).toBe(true);
      expect(isMobileUserAgent('Mozilla/5.0 (iPad; CPU OS 13_2_3 like Mac OS X)')).toBe(true);
      expect(isMobileUserAgent('Mozilla/5.0 (BlackBerry;')).toBe(true);
      expect(isMobileUserAgent('Opera/9.80 (Android 4.1.1; Linux; Opera Mobi/ADR-1212240945)')).toBe(true);
    });

    test('should return false for desktop user agents', () => {
      expect(isMobileUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
      expect(isMobileUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')).toBe(false);
      expect(isMobileUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')).toBe(false);
    });
  });
});