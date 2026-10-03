import re

with open('mockups/vendor-registration-v2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('mockups/vendor-registration-v2/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

with open('mockups/vendor-registration-v2/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

print("--- CSS classes matching 'box' ---")
css_boxes = set(re.findall(r'\.([a-zA-Z0-9_-]*box[a-zA-Z0-9_-]*)', css, re.IGNORECASE))
for c in sorted(css_boxes):
    print(" ", c)

print("\n--- HTML classes matching 'box' ---")
html_boxes = set(re.findall(r'class="([^"]*box[^"]*)"', html, re.IGNORECASE))
for c in sorted(html_boxes):
    print(" ", c)

print("\n--- All multi-select / toggleable components in script.js ---")
# Search for functions with toggle or push/filter
toggles = re.findall(r'function\s+(toggle\w+|set\w+|select\w+)\s*\([^)]*\)', js)
for t in toggles:
    print(" ", t)
