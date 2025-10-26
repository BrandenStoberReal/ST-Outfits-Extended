const fs = require('fs');
const path = require('path');

function addJsExtensionsToImports(distDir) {
    const files = getAllJsFiles(distDir);

    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');

        // Regular expression to match import statements that don't have .js extension
        const importRegex = /(from\s+["'])([^"']*)(["'])/g;

        let updatedContent = content.replace(importRegex, (match, before, importPath, after) => {
            // If the import path doesn't already end with .js and is a relative path
            if (!importPath.endsWith('.js') && (importPath.startsWith('./') || importPath.startsWith('../'))) {
                return before + importPath + '.js' + after;
            }
            return match;
        });

        // Write the updated content back to the file
        fs.writeFileSync(file, updatedContent, 'utf8');
        console.log(`Updated imports in: ${file}`);
    });

    console.log(`Successfully updated ${files.length} files.`);
}

function getAllJsFiles(dir) {
    const files = [];

    function walk(dir) {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                walk(itemPath);
            } else if (item.endsWith('.js')) {
                files.push(itemPath);
            }
        }
    }

    walk(dir);
    return files;
}

// Run the script on the dist directory
if (process.argv[2]) {
    addJsExtensionsToImports(process.argv[2]);
} else {
    addJsExtensionsToImports('./dist');
}