// Showdown extension that highlights quoted text in orange
export const markdownQuotesOrangeExt = () => {
    try {
        return [{
            type: 'output',
            filter: function (html) {
                // Non-regex approach: find and replace quoted text with corresponding opening and closing characters
                return processQuotesInHtml(html);
            }
        }];
    } catch (e) {
        console.error('Error in Showdown-quotes-orange extension:', e);
        return [];
    }
};

// Helper function to process quotes without using regex
function processQuotesInHtml(html) {
    // Process the HTML content to find quoted text with matching opening and closing quotes
    // We'll look for matched pairs of quotes and apply orange styling to the content between them
    
    // Process double quotes
    let result = processQuoteType(html, '"', '"');
    // Then process HTML entity quotes
    result = processQuoteType(result, '&quot;', '&quot;');
    // Then process single quotes on the result, but be more careful about them
    result = processSingleQuotes(result);
    
    return result;
}

function processQuoteType(html, openQuote, closeQuote) {
    const result = [];
    let i = 0;
    let pos = 0;
    
    while (i < html.length) {
        // Look for opening quote
        let openIndex = -1;
        if (openQuote.length === 1) {
            // For single character quotes
            openIndex = html.indexOf(openQuote, i);
        } else {
            // For multi-character quotes like &quot;
            openIndex = html.indexOf(openQuote, i);
        }
        
        if (openIndex === -1) {
            // No more opening quotes, add the rest of the string and break
            result.push(html.substring(pos));
            break;
        }
        
        // Add content before the opening quote
        result.push(html.substring(pos, openIndex));
        
        // Find the matching closing quote
        const quoteStart = openIndex + openQuote.length;
        let closeIndex = -1;
        
        if (closeQuote.length === 1) {
            closeIndex = html.indexOf(closeQuote, quoteStart);
        } else {
            closeIndex = html.indexOf(closeQuote, quoteStart);
        }
        
        if (closeIndex === -1) {
            // No closing quote found, add the opening quote literally and continue
            result.push(openQuote);
            pos = openIndex + openQuote.length;
            i = pos;
            continue;
        }
        
        // Add the opening quote + the quoted content wrapped in orange span + closing quote
        result.push(openQuote);
        result.push(`<span style="color: orange; font-weight: 500;">${html.substring(quoteStart, closeIndex)}</span>`);
        result.push(closeQuote);
        
        // Move position past the closing quote
        pos = closeIndex + closeQuote.length;
        i = pos;
    }
    
    return result.join('');
}

// Special function to handle single quotes more carefully (to avoid possessives)
function processSingleQuotes(html) {
    const result = [];
    let i = 0;
    let pos = 0;
    
    while (i < html.length) {
        // Look for opening single quote
        const openIndex = html.indexOf("'", i);
        
        if (openIndex === -1) {
            // No more opening quotes, add the rest of the string and break
            result.push(html.substring(pos));
            break;
        }
        
        // Add content before the opening quote
        result.push(html.substring(pos, openIndex));
        
        // Find the matching closing quote
        const quoteStart = openIndex + 1; // length of single quote is 1
        let closeIndex = -1;
        
        // Look for closing single quote, but we need to be smarter about this
        // to avoid matching apostrophes in words like "don't" or "clothing's"
        closeIndex = findMatchingSingleQuote(html, quoteStart);
        
        if (closeIndex === -1) {
            // No closing quote found, add the opening quote literally and continue
            result.push("'");
            pos = openIndex + 1;
            i = pos;
            continue;
        }
        
        // Add the opening quote + the quoted content wrapped in orange span + closing quote
        result.push("'");
        result.push(`<span style="color: orange; font-weight: 500;">${html.substring(quoteStart, closeIndex)}</span>`);
        result.push("'");
        
        // Move position past the closing quote
        pos = closeIndex + 1;
        i = pos;
    }
    
    return result.join('');
}

// Helper function to find the matching closing single quote
function findMatchingSingleQuote(html, startPos) {
    // Look for a closing quote that is likely to be a real closing quote
    // and not just an apostrophe in a contraction or possessive
    
    for (let i = startPos; i < html.length; i++) {
        if (html[i] === "'") {
            // Check if this looks like a closing quote by examining surrounding characters
            // A closing quote typically appears at the end of a word or before punctuation/space
            
            // If the character before the quote is a space, punctuation, or beginning of content,
            // and the character after is a space, punctuation, or end of content,
            // it's more likely to be a quote rather than an apostrophe
            const prevChar = i > 0 ? html[i - 1] : '';
            const nextChar = i < html.length - 1 ? html[i + 1] : '';
            
            // Common cases where a single quote is likely an apostrophe and not a quote:
            // - followed by 's' (possessive: "clothing's")
            // - preceded by a letter and followed by 't' (contraction: "don't", "can't")
            // - preceded by common letters and followed by 're', 've', 'll' (contractions: "we're", "you've", "we'll")
            
            if (nextChar === 's' && 
                (prevChar === 'n' || prevChar === 'g' || 
                 /^[a-zA-Z]$/.test(prevChar) && !/[aeiouAEIOU]/.test(prevChar))) {
                // Likely possessive like "clothing's", "James'", "dog's" - skip
                continue;
            }
            
            if (nextChar === 't' && prevChar === 'n') {
                // Likely contraction like "can't", "won't" - skip
                continue;
            }
            
            if (nextChar === 't' && prevChar === 't') {
                // Likely contraction like "that's" - skip
                continue;
            }
            
            if (nextChar === 'r' && i + 2 < html.length && html[i + 2] === 'e' && /^[a-zA-Z]$/.test(prevChar)) {
                // Likely contraction like "we're", "they're" - skip
                continue;
            }
            
            if (nextChar === 'v' && i + 2 < html.length && html[i + 2] === 'e' && /^[a-zA-Z]$/.test(prevChar)) {
                // Likely contraction like "you've", "we've" - skip
                continue;
            }
            
            if (nextChar === 'l' && i + 2 < html.length && html[i + 2] === 'l' && /^[a-zA-Z]$/.test(prevChar)) {
                // Likely contraction like "we'll", "he'll" - skip
                continue;
            }
            
            if (nextChar === 'd' && (i + 2 >= html.length || html[i + 2] !== ' ')) {
                // Likely contraction like "I'd", "you'd" - skip unless followed by space
                continue;
            }
            
            // If it's followed by space or punctuation, more likely a closing quote
            if (/[ .,;:!?)/\]}\\-]/.test(nextChar) || i === html.length - 1 ||
                /[ .,;:!?)/\]}\\-]/.test(prevChar) && !/[a-zA-Z]/.test(nextChar)) {
                return i; // This looks like a proper closing quote
            }
        }
    }
    
    return -1; // No matching closing quote found
}

// Function to register the extension with the global converter
export function registerQuotesOrangeExtension() {
    if (window.SillyTavern && window.SillyTavern.libs && window.SillyTavern.libs.showdown) {
        // Add the extension to the showdown library
        window.SillyTavern.libs.showdown.extension('quotes-orange', markdownQuotesOrangeExt);
    } else {
        console.warn('SillyTavern showdown library not found, quotes orange extension will not be registered');
    }
}