const fs = require('fs');

const html = fs.readFileSync('mockups/vendor-registration-v2/index.html', 'utf8');
const js = fs.readFileSync('mockups/vendor-registration-v2/script.js', 'utf8');
const css = fs.readFileSync('mockups/vendor-registration-v2/styles.css', 'utf8');

console.log("--- CSS classes matching 'box' ---");
const cssBoxes = new Set(css.match(/\.([a-zA-Z0-9_-]*box[a-zA-Z0-9_-]*)/gi) || []);
Array.from(cssBoxes).sort().forEach(c => console.log(" ", c));

console.log("\n--- HTML classes matching 'box' ---");
const htmlBoxes = new Set(html.match(/class="([^"]*box[^"]*)"/gi) || []);
Array.from(htmlBoxes).sort().forEach(c => console.log(" ", c));

console.log("\n--- All toggle/select functions in script.js ---");
const toggles = js.match(/function\s+(toggle\w+|set\w+|select\w+|add\w+|remove\w+|save\w+|delete\w+)\s*\([^)]*\)/gi) || [];
toggles.forEach(t => console.log(" ", t));
