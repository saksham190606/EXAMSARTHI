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

// Regex to capture classNames in JSX or strings
// e.g. className="..." or className={cn(...)} or cva(...)
const files = getFiles('src');

// Map prefixes to category
function getCategory(cls) {
  // Strip variants like md:, dark:, hover:, focus:, etc.
  const parts = cls.split(':');
  const variant = parts.slice(0, -1).sort().join(':');
  const base = parts[parts.length - 1];

  // categorize base
  let cat = null;
  // padding
  if (/^p-(\d+|\[.*\])/.test(base)) cat = 'p';
  else if (/^px-(\d+|\[.*\])/.test(base)) cat = 'px';
  else if (/^py-(\d+|\[.*\])/.test(base)) cat = 'py';
  else if (/^pt-(\d+|\[.*\])/.test(base)) cat = 'pt';
  else if (/^pb-(\d+|\[.*\])/.test(base)) cat = 'pb';
  else if (/^pl-(\d+|\[.*\])/.test(base)) cat = 'pl';
  else if (/^pr-(\d+|\[.*\])/.test(base)) cat = 'pr';
  // margin
  else if (/^m-(\d+|\[.*\]|auto)/.test(base)) cat = 'm';
  else if (/^mx-(\d+|\[.*\]|auto)/.test(base)) cat = 'mx';
  else if (/^my-(\d+|\[.*\]|auto)/.test(base)) cat = 'my';
  else if (/^mt-(\d+|\[.*\]|auto)/.test(base)) cat = 'mt';
  else if (/^mb-(\d+|\[.*\]|auto)/.test(base)) cat = 'mb';
  else if (/^ml-(\d+|\[.*\]|auto)/.test(base)) cat = 'ml';
  else if (/^mr-(\d+|\[.*\]|auto)/.test(base)) cat = 'mr';
  // width/height
  else if (/^w-(\d+|full|screen|auto|fit|min|max|\[.*\])/.test(base)) cat = 'w';
  else if (/^h-(\d+|full|screen|auto|fit|min|max|\[.*\])/.test(base)) cat = 'h';
  else if (/^min-w-/.test(base)) cat = 'min-w';
  else if (/^min-h-/.test(base)) cat = 'min-h';
  else if (/^max-w-/.test(base)) cat = 'max-w';
  else if (/^max-h-/.test(base)) cat = 'max-h';
  // display
  else if (/^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents)$/.test(base)) cat = 'display';
  // position
  else if (/^(static|fixed|absolute|relative|sticky)$/.test(base)) cat = 'position';
  // bg color
  else if (/^bg-/.test(base) && !/^bg-(repeat|no-repeat|auto|cover|contain|bottom|top|center|left|right)/.test(base)) cat = 'bg-color';
  // text color
  else if (/^text-([a-z]+(-[a-z0-9]+)*|\[.*\])$/.test(base) && !/^(text-(left|center|right|justify|start|end|xs|sm|base|lg|xl|[2-9]xl))$/.test(base)) cat = 'text-color';
  // text size
  else if (/^text-(xs|sm|base|lg|xl|[2-9]xl)$/.test(base)) cat = 'text-size';
  // text align
  else if (/^text-(left|center|right|justify|start|end)$/.test(base)) cat = 'text-align';
  // font weight
  else if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(base)) cat = 'font-weight';
  // rounded
  else if (/^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full|)$/.test(base)) cat = 'rounded';
  // border width
  else if (/^border(-0|-2|-4|-8|)$/.test(base)) cat = 'border-width';
  // border color
  else if (/^border-(?!0|2|4|8|t|b|l|r|x|y|solid|dashed|dotted|double|none)([a-z]+(-[a-z0-9]+)*)/.test(base)) cat = 'border-color';
  // flex direction
  else if (/^flex-(row|row-reverse|col|col-reverse)$/.test(base)) cat = 'flex-dir';
  // justify
  else if (/^justify-(normal|start|end|center|between|around|evenly|stretch)$/.test(base)) cat = 'justify';
  // items
  else if (/^items-(start|end|center|baseline|stretch)$/.test(base)) cat = 'items';
  // gap
  else if (/^gap-(\d+|\[.*\])/.test(base)) cat = 'gap';
  // overflow
  else if (/^overflow-(auto|hidden|clip|visible|scroll)$/.test(base)) cat = 'overflow';
  else if (/^overflow-x-(auto|hidden|clip|visible|scroll)$/.test(base)) cat = 'overflow-x';
  else if (/^overflow-y-(auto|hidden|clip|visible|scroll)$/.test(base)) cat = 'overflow-y';

  return { variant, cat, base, full: cls };
}

let conflictsFound = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // match string literals in className="..." or className={`...`} or cn(...)
  // simple string extraction
  const strRegex = /(?:className|class)\s*=\s*(?:["'`]([^"'`]+)["'`]|{\s*cn\(([^}]+)\)\s*})/g;
  
  lines.forEach((line, idx) => {
    // Also look for simple string literals inside className or cva
    const matches = line.matchAll(/["'`]([^"'`]{4,})["'`]/g);
    for (const match of matches) {
      const classStr = match[1];
      // check if it looks like a list of tailwind classes
      const tokens = classStr.trim().split(/\s+/).filter(Boolean);
      if (tokens.length < 2) continue;
      
      const seen = new Map();
      tokens.forEach(t => {
        const info = getCategory(t);
        if (!info.cat) return;
        const key = `${info.variant}::${info.cat}`;
        if (seen.has(key)) {
          conflictsFound.push({
            file,
            line: idx + 1,
            conflict: [seen.get(key), t],
            cat: info.cat,
            variant: info.variant,
            fullString: classStr
          });
        } else {
          seen.set(key, t);
        }
      });
    }
  });
});

console.log(`Found ${conflictsFound.length} potential conflicts:`);
conflictsFound.forEach(c => {
  console.log(`${c.file}:${c.line} [${c.cat}]: ${c.conflict.join(' vs ')} in "${c.fullString}"`);
});
