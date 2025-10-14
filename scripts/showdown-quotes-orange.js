// Showdown extension that highlights quoted text in orange
export const markdownQuotesOrangeExt = () => {
    try {
        return [{
            type: 'output',
            filter: function (html) {
                // Non-regex approach: find and replace quoted text
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
    // Process the HTML content to find quoted text and wrap it in orange spans
    // We'll look for matched pairs of quotes and apply orange styling to the content between them
    
    // Process double quotes
    let result = processQuoteType(html, '"', '"');
    // Then process single quotes on the result
    result = processQuoteType(result, "'", "'");
    // Then process HTML entity quotes
    result = processQuoteType(result, '&quot;', '&quot;');
    
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
        
        // Add the opening quote
        result.push(openQuote);
        
        // Extract the quoted content
        const quotedContent = html.substring(quoteStart, closeIndex);
        
        // Add the quoted content wrapped in orange span
        result.push(`<span style="color: orange; font-weight: 500;">${quotedContent}</span>`);
        
        // Add the closing quote
        result.push(closeQuote);
        
        // Move position past the closing quote
        pos = closeIndex + closeQuote.length;
        i = pos;
    }
    
    return result.join('');
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