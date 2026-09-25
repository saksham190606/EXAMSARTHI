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

// Complete Tailwind CSS property map for conflict detection
const propertyGroups = [
  { name: 'font-size', regex: /^text-(xs|sm|base|lg|xl|[2-9]xl)$/ },
  { name: 'font-weight', regex: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/ },
  { name: 'text-align', regex: /^text-(left|center|right|justify|start|end)$/ },
  { name: 'text-color', regex: /^text-(?!xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty)[a-zA-Z0-9_\-\/\[\]]+$/ },
  { name: 'bg-color', regex: /^bg-(?!repeat|no-repeat|auto|cover|contain|bottom|top|center|left|right|clip)[a-zA-Z0-9_\-\/\[\]]+$/ },
  { name: 'display', regex: /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents)$/ },
  { name: 'position', regex: /^(static|fixed|absolute|relative|sticky)$/ },
  { name: 'rounded', regex: /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full|\[.*\])?$/ },
  { name: 'width', regex: /^w-(?!auto|px)(\d+|full|screen|min|max|fit|\[.*\]|\d+\/\d+)$/ },
  { name: 'height', regex: /^h-(?!auto|px)(\d+|full|screen|min|max|fit|\[.*\]|\d+\/\d+)$/ },
  { name: 'overflow', regex: /^overflow-(auto|hidden|clip|visible|scroll)$/ },
  { name: 'overflow-x', regex: /^overflow-x-(auto|hidden|clip|visible|scroll)$/ },
  { name: 'overflow-y', regex: /^overflow-y-(auto|hidden|clip|visible|scroll)$/ },
  { name: 'flex-direction', regex: /^flex-(row|row-reverse|col|col-reverse)$/ },
  { name: 'items', regex: /^items-(start|end|center|baseline|stretch)$/ },
  { name: 'justify', regex: /^justify-(normal|start|end|center|between|around|evenly|stretch)$/ },
  { name: 'gap', regex: /^gap-(\d+|\[.*\])/ },
  { name: 'padding-all', regex: /^p-(\d+|\[.*\])/ },
  { name: 'padding-x', regex: /^px-(\d+|\[.*\])/ },
  { name: 'padding-y', regex: /^py-(\d+|\[.*\])/ },
  { name: 'padding-t', regex: /^pt-(\d+|\[.*\])/ },
  { name: 'padding-b', regex: /^pb-(\d+|\[.*\])/ },
  { name: 'padding-l', regex: /^pl-(\d+|\[.*\])/ },
  { name: 'padding-r', regex: /^pr-(\d+|\[.*\])/ },
  { name: 'margin-all', regex: /^m-(\d+|auto|\[.*\])/ },
  { name: 'margin-x', regex: /^mx-(\d+|auto|\[.*\])/ },
  { name: 'margin-y', regex: /^my-(\d+|auto|\[.*\])/ },
  { name: 'margin-t', regex: /^mt-(\d+|auto|\[.*\])/ },
  { name: 'margin-b', regex: /^mb-(\d+|auto|\[.*\])/ },
  { name: 'margin-l', regex: /^ml-(\d+|auto|\[.*\])/ },
  { name: 'margin-r', regex: /^mr-(\d+|auto|\[.*\])/ },
  { name: 'border-width', regex: /^border(-0|-2|-4|-8)?$/ },
  { name: 'border-color', regex: /^border-(?!0|2|4|8|t|b|l|r|x|y|solid|dashed|dotted|double|none)[a-zA-Z0-9_\-\/\[\]]+$/ },
  { name: 'shadow', regex: /^shadow(-none|-sm|-md|-lg|-xl|-2xl|-inner)?$/ },
  { name: 'opacity', regex: /^opacity-(\d+|\[.*\])$/ },
  { name: 'z-index', regex: /^z-(\d+|auto|\[.*\])$/ }
];

// In Tailwind IntelliSense, padding-all conflicts with padding-x/y/t/b/l/r if applied together without different variants!
const overlappingGroups = [
  ['padding-all', 'padding-x'],
  ['padding-all', 'padding-y'],
  ['padding-all', 'padding-t'],
  ['padding-all', 'padding-b'],
  ['padding-all', 'padding-l'],
  ['padding-all', 'padding-r'],
  ['padding-x', 'padding-l'],
  ['padding-x', 'padding-r'],
  ['padding-y', 'padding-t'],
  ['padding-y', 'padding-b'],
  ['margin-all', 'margin-x'],
  ['margin-all', 'margin-y'],
  ['margin-all', 'margin-t'],
  ['margin-all', 'margin-b'],
  ['margin-all', 'margin-l'],
  ['margin-all', 'margin-r'],
  ['margin-x', 'margin-l'],
  ['margin-x', 'margin-r'],
  ['margin-y', 'margin-t'],
  ['margin-y', 'margin-b'],
  ['overflow', 'overflow-x'],
  ['overflow', 'overflow-y']
];

function checkTokens(tokens) {
  const conflicts = [];
  const tokenInfos = [];

  for (const t of tokens) {
    // extract modifiers like sm:, hover:, dark:, focus:
    const parts = t.split(':');
    const base = parts.pop();
    const modifier = parts.sort().join(':');

    for (const group of propertyGroups) {
      if (group.regex.test(base)) {
        tokenInfos.push({
          full: t,
          base,
          modifier,
          group: group.name
        });
        break;
      }
    }
  }

  // Check for same group conflicts
  for (let i = 0; i < tokenInfos.length; i++) {
    for (let j = i + 1; j < tokenInfos.length; j++) {
      const a = tokenInfos[i];
      const b = tokenInfos[j];
      if (a.modifier !== b.modifier) continue;

      if (a.group === b.group) {
        conflicts.push({ a: a.full, b: b.full, reason: `same property ${a.group} (${a.modifier || 'default'})` });
      } else {
        // check overlapping groups
        for (const [g1, g2] of overlappingGroups) {
          if ((a.group === g1 && b.group === g2) || (a.group === g2 && b.group === g1)) {
            conflicts.push({ a: a.full, b: b.full, reason: `overlapping properties ${a.group} vs ${b.group} (${a.modifier || 'default'})` });
          }
        }
      }
    }
  }

  return conflicts;
}

const files = getFiles('src');
let totalConflicts = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, lineNum) => {
    // Match string literals
    const strMatches = line.matchAll(/(["'`])([^"'`]+)\1/g);
    for (const m of strMatches) {
      const str = m[2].trim();
      const tokens = str.split(/\s+/).filter(Boolean);
      if (tokens.length < 2) continue;

      const conflicts = checkTokens(tokens);
      if (conflicts.length > 0) {
        conflicts.forEach(c => {
          totalConflicts++;
          console.log(`[${totalConflicts}] ${file}:${lineNum + 1} -> "${c.a}" vs "${c.b}" (${c.reason})`);
        });
      }
    }
  });
});

console.log(`\nTotal conflicts detected: ${totalConflicts}`);
