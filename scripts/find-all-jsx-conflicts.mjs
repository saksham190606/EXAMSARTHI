import fs from 'fs';
import path from 'path';
import tsParser from '@typescript-eslint/parser';

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

// Function to classify any tailwind class token
function getTokenInfo(token) {
  const parts = token.split(':');
  const base = parts.pop();
  const modifier = parts.sort().join(':');

  let category = null;

  // Font size
  if (/^text-(xs|sm|base|lg|xl|[2-9]xl)$/.test(base)) category = 'font-size';
  // Text color - any text-* that is not size, align, or wrap
  else if (/^text-([a-z0-9_\-\/\[\]]+)$/.test(base) && !/^(text-(left|center|right|justify|start|end|wrap|nowrap|balance|pretty))$/.test(base)) category = 'text-color';
  // Font weight
  else if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(base)) category = 'font-weight';
  // Text align
  else if (/^text-(left|center|right|justify|start|end)$/.test(base)) category = 'text-align';
  // Padding
  else if (/^p-(\d+|\[.*\])/.test(base)) category = 'padding-all';
  else if (/^px-(\d+|\[.*\])/.test(base)) category = 'padding-x';
  else if (/^py-(\d+|\[.*\])/.test(base)) category = 'padding-y';
  else if (/^pt-(\d+|\[.*\])/.test(base)) category = 'padding-t';
  else if (/^pb-(\d+|\[.*\])/.test(base)) category = 'padding-b';
  else if (/^pl-(\d+|\[.*\])/.test(base)) category = 'padding-l';
  else if (/^pr-(\d+|\[.*\])/.test(base)) category = 'padding-r';
  // Margin
  else if (/^m-(\d+|auto|\[.*\])/.test(base)) category = 'margin-all';
  else if (/^mx-(\d+|auto|\[.*\])/.test(base)) category = 'margin-x';
  else if (/^my-(\d+|auto|\[.*\])/.test(base)) category = 'margin-y';
  else if (/^mt-(\d+|auto|\[.*\])/.test(base)) category = 'margin-t';
  else if (/^mb-(\d+|auto|\[.*\])/.test(base)) category = 'margin-b';
  else if (/^ml-(\d+|auto|\[.*\])/.test(base)) category = 'margin-l';
  else if (/^mr-(\d+|auto|\[.*\])/.test(base)) category = 'margin-r';
  // Border width
  else if (/^border(-0|-2|-4|-8)?$/.test(base)) category = 'border-width-all';
  else if (/^border-t(-0|-2|-4|-8)?$/.test(base)) category = 'border-width-t';
  else if (/^border-b(-0|-2|-4|-8)?$/.test(base)) category = 'border-width-b';
  else if (/^border-l(-0|-2|-4|-8)?$/.test(base)) category = 'border-width-l';
  else if (/^border-r(-0|-2|-4|-8)?$/.test(base)) category = 'border-width-r';
  // Border color
  else if (/^border-([a-z0-9_\-\/\[\]]+)$/.test(base) && !/^(border-(0|2|4|8|t|b|l|r|x|y|solid|dashed|dotted|double|none))$/.test(base)) category = 'border-color-all';
  else if (/^border-r-([a-z0-9_\-\/\[\]]+)$/.test(base)) category = 'border-color-r';
  else if (/^border-l-([a-z0-9_\-\/\[\]]+)$/.test(base)) category = 'border-color-l';
  else if (/^border-t-([a-z0-9_\-\/\[\]]+)$/.test(base)) category = 'border-color-t';
  else if (/^border-b-([a-z0-9_\-\/\[\]]+)$/.test(base)) category = 'border-color-b';
  // Rounded
  else if (/^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-4xl|-full|\[.*\])?$/.test(base)) category = 'rounded-all';
  else if (/^rounded-t(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-4xl|-full|\[.*\])?$/.test(base)) category = 'rounded-t';
  else if (/^rounded-b(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-4xl|-full|\[.*\])?$/.test(base)) category = 'rounded-b';
  // Display
  else if (/^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents)$/.test(base)) category = 'display';
  // Width
  else if (/^w-(\d+|auto|full|screen|min|max|fit|\[.*\]|\d+\/\d+)$/.test(base)) category = 'width';
  // Height
  else if (/^h-(\d+|auto|full|screen|min|max|fit|\[.*\]|\d+\/\d+)$/.test(base)) category = 'height';
  // Background color
  else if (/^bg-([a-z0-9_\-\/\[\]]+)$/.test(base) && !/^(bg-(repeat|no-repeat|auto|cover|contain|bottom|top|center|left|right|clip-[a-z]+))$/.test(base)) category = 'bg-color';

  return { token, base, modifier, category };
}

const conflictMatrix = {
  'padding-all': ['padding-all', 'padding-x', 'padding-y', 'padding-t', 'padding-b', 'padding-l', 'padding-r'],
  'padding-x': ['padding-x', 'padding-l', 'padding-r'],
  'padding-y': ['padding-y', 'padding-t', 'padding-b'],
  'padding-t': ['padding-t'],
  'padding-b': ['padding-b'],
  'padding-l': ['padding-l'],
  'padding-r': ['padding-r'],
  'margin-all': ['margin-all', 'margin-x', 'margin-y', 'margin-t', 'margin-b', 'margin-l', 'margin-r'],
  'margin-x': ['margin-x', 'margin-l', 'margin-r'],
  'margin-y': ['margin-y', 'margin-t', 'margin-b'],
  'margin-t': ['margin-t'],
  'margin-b': ['margin-b'],
  'margin-l': ['margin-l'],
  'margin-r': ['margin-r'],
  'font-size': ['font-size'],
  'font-weight': ['font-weight'],
  'text-align': ['text-align'],
  'text-color': ['text-color'],
  'bg-color': ['bg-color'],
  'display': ['display'],
  'width': ['width'],
  'height': ['height'],
  'border-width-all': ['border-width-all', 'border-width-t', 'border-width-b', 'border-width-l', 'border-width-r'],
  'border-color-all': ['border-color-all', 'border-color-r', 'border-color-l', 'border-color-t', 'border-color-b'],
  'border-color-r': ['border-color-r'],
  'border-color-l': ['border-color-l'],
  'border-color-t': ['border-color-t'],
  'border-color-b': ['border-color-b'],
  'rounded-all': ['rounded-all', 'rounded-t', 'rounded-b'],
};

function checkConflict(catA, catB) {
  if (!catA || !catB) return false;
  if (catA === catB) return true;
  if (conflictMatrix[catA] && conflictMatrix[catA].includes(catB)) return true;
  if (conflictMatrix[catB] && conflictMatrix[catB].includes(catA)) return true;
  return false;
}

const files = getFiles('src');
let total = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = tsParser.parse(content, {
      ecmaFeatures: { jsx: true },
      sourceType: 'module',
    });
  } catch (e) {
    return;
  }

  function checkString(str, loc) {
    const tokens = str.trim().split(/\s+/).filter(Boolean);
    const infos = tokens.map(getTokenInfo).filter(t => t.category);

    for (let i = 0; i < infos.length; i++) {
      for (let j = i + 1; j < infos.length; j++) {
        const a = infos[i];
        const b = infos[j];
        if (a.modifier === b.modifier && a.token !== b.token) {
          if (checkConflict(a.category, b.category)) {
            total++;
            console.log(`[#${total}] ${file}:${loc?.start?.line || '?'}:${loc?.start?.column || '?'} -> "${a.token}" vs "${b.token}" (${a.category} vs ${b.category}) in "${str.slice(0, 50)}..."`);
          }
        }
      }
    }
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'JSXAttribute' && node.name && node.name.name === 'className') {
      if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
        checkString(node.value.value, node.loc);
      } else if (node.value && node.value.type === 'JSXExpressionContainer') {
        if (node.value.expression && node.value.expression.type === 'TemplateLiteral') {
          node.value.expression.quasis.forEach(q => {
            checkString(q.value.raw, q.loc);
          });
        }
      }
    }

    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const isCnOrCva = (callee.type === 'Identifier' && (callee.name === 'cn' || callee.name === 'cva'));
      if (isCnOrCva) {
        node.arguments.forEach(arg => {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkString(arg.value, arg.loc);
          } else if (arg.type === 'TemplateLiteral') {
            arg.quasis.forEach(q => {
              checkString(q.value.raw, q.loc);
            });
          }
        });
      }
    }

    if (node.type === 'Property' && node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
      checkString(node.value.value, node.loc);
    }

    for (const key of Object.keys(node)) {
      if (Array.isArray(node[key])) {
        node[key].forEach(walk);
      } else if (typeof node[key] === 'object') {
        walk(node[key]);
      }
    }
  }

  walk(ast);
});

console.log(`\nGrand Total Conflicts: ${total}`);
