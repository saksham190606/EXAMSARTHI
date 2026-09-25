const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) results = results.concat(getFiles(filePath));
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(filePath);
  });
  return results;
}

// In Tailwind CSS IntelliSense:
// Rules for cssConflict:
// Two classes that define the same CSS declaration on the same element at the same media/state variant.
// Common examples:
// 1. font-size: text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, etc.
// 2. font-weight: font-normal, font-medium, font-semibold, font-bold, etc.
// 3. text-align: text-left, text-center, text-right, text-justify
// 4. text-color: text-foreground, text-primary, text-muted-foreground, etc.
//    NOTE: text-2xs is treated by Tailwind as text-color (since 2xs is not defined in default fontSize theme)
// 5. bg-color: bg-primary, bg-background, bg-muted, etc.
// 6. padding:
//    p-* conflicts with pt-*, pb-*, pl-*, pr-*, px-*, py-*
//    px-* conflicts with pl-*, pr-*
//    py-* conflicts with pt-*, pb-*
// 7. margin:
//    m-* conflicts with mt-*, mb-*, ml-*, mr-*, mx-*, my-*
//    mx-* conflicts with ml-*, mr-*
//    my-* conflicts with mt-*, mb-*
// 8. rounded: rounded conflicts with rounded-md, rounded-lg, rounded-full, rounded-t-*, etc.
// 9. border-width: border conflicts with border-2, border-0, border-t, etc.
// 10. border-color: border-border, border-primary, border-muted, etc.
// 11. display: flex, inline-flex, block, inline-block, grid, hidden
// 12. position: absolute, relative, fixed, sticky
// 13. width: w-full, w-auto, w-screen, w-[...], w-1/2, w-4, etc.
// 14. height: h-full, h-auto, h-screen, h-[...], h-4, etc.
// 15. overflow: overflow-hidden, overflow-auto, overflow-x-*, overflow-y-*
// 16. gap: gap-2, gap-4, gap-x-*, gap-y-*
// 17. items: items-center, items-start, etc.
// 18. justify: justify-between, justify-center, etc.

const files = getFiles('src');

const conflicts = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match all string literals in JSX or code
  const regex = /(["'`])([^"'`\n]+)\1/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const raw = match[2];
    const tokens = raw.trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 2) continue;

    // Group by variant
    const byVariant = {};
    tokens.forEach(tok => {
      const parts = tok.split(':');
      const base = parts.pop();
      const variant = parts.sort().join(':');
      if (!byVariant[variant]) byVariant[variant] = [];
      byVariant[variant].push({ full: tok, base });
    });

    Object.entries(byVariant).forEach(([variant, items]) => {
      // Check pairs in items
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];

          // Check font-size
          const isSize = (s) => /^(text-(xs|sm|base|lg|xl|[2-9]xl)|text-\[.*\])$/.test(s);
          if (isSize(a.base) && isSize(b.base) && a.base !== b.base) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'font-size', raw });
          }

          // Check text-color vs text-color
          // Note: text-2xs is treated as text-color in default tailwind!
          const isTextColor = (s) => (s.startsWith('text-') && !isSize(s) && !/^(text-(left|center|right|justify|start|end|wrap|nowrap|balance|pretty))$/.test(s));
          if (isTextColor(a.base) && isTextColor(b.base) && a.base !== b.base) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'text-color', raw });
          }

          // Check bg-color
          const isBgColor = (s) => (s.startsWith('bg-') && !/^(bg-(repeat|no-repeat|auto|cover|contain|bottom|top|center|left|right|clip-[a-z]+))$/.test(s));
          if (isBgColor(a.base) && isBgColor(b.base) && a.base !== b.base) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'bg-color', raw });
          }

          // Check font-weight
          const isWeight = (s) => /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(s);
          if (isWeight(a.base) && isWeight(b.base) && a.base !== b.base) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'font-weight', raw });
          }

          // Check display
          const isDisplay = (s) => /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents)$/.test(s);
          if (isDisplay(a.base) && isDisplay(b.base) && a.base !== b.base) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'display', raw });
          }

          // Check position
          const isPos = (s) => /^(static|fixed|absolute|relative|sticky)$/.test(s);
          if (isPos(a.base) && isPos(b.base) && a.base !== b.base) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'position', raw });
          }

          // Check rounded
          const isRounded = (s) => /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full|\[.*\])?$/.test(s);
          if (isRounded(a.base) && isRounded(b.base) && a.base !== b.base) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'rounded', raw });
          }

          // Check padding
          // p-* with pt, pb, pl, pr, px, py
          if (/^p-(\d+|\[.*\])/.test(a.base) && /^(px|py|pt|pb|pl|pr)-(\d+|\[.*\])/.test(b.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'padding-conflict', raw });
          }
          if (/^p-(\d+|\[.*\])/.test(b.base) && /^(px|py|pt|pb|pl|pr)-(\d+|\[.*\])/.test(a.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'padding-conflict', raw });
          }
          if (/^px-(\d+|\[.*\])/.test(a.base) && /^(pl|pr)-(\d+|\[.*\])/.test(b.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'padding-conflict', raw });
          }
          if (/^py-(\d+|\[.*\])/.test(a.base) && /^(pt|pb)-(\d+|\[.*\])/.test(b.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'padding-conflict', raw });
          }

          // Check margin
          if (/^m-(\d+|auto|\[.*\])/.test(a.base) && /^(mx|my|mt|mb|ml|mr)-(\d+|auto|\[.*\])/.test(b.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'margin-conflict', raw });
          }
          if (/^m-(\d+|auto|\[.*\])/.test(b.base) && /^(mx|my|mt|mb|ml|mr)-(\d+|auto|\[.*\])/.test(a.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'margin-conflict', raw });
          }
          if (/^mx-(\d+|auto|\[.*\])/.test(a.base) && /^(ml|mr)-(\d+|auto|\[.*\])/.test(b.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'margin-conflict', raw });
          }
          if (/^my-(\d+|auto|\[.*\])/.test(a.base) && /^(mt|mb)-(\d+|auto|\[.*\])/.test(b.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'margin-conflict', raw });
          }

          // Check overflow
          if (/^overflow-(auto|hidden|clip|visible|scroll)$/.test(a.base) && /^overflow-(x|y)-(auto|hidden|clip|visible|scroll)$/.test(b.base)) {
            conflicts.push({ file, a: a.full, b: b.full, type: 'overflow-conflict', raw });
          }
        }
      }
    });
  }
});

console.log(`Found ${conflicts.length} conflicts:`);
conflicts.forEach((c, idx) => {
  console.log(`${idx + 1}. [${c.type}] ${c.file}: "${c.a}" vs "${c.b}"\n   Context: "${c.raw.slice(0, 100)}..."\n`);
});
