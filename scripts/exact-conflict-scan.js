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

const files = getFiles('src');

// Let's inspect other common conflicts:
// 1. px-4 pt-6 vs p-4 pt-6 (p-4 sets padding-top, pt-6 also sets padding-top)
// 2. py-4 pb-32 vs p-4 pb-32
// 3. border border-b or border border-t
// 4. rounded-lg rounded-xl
// 5. text-sm text-base or text-xs
// 6. font-medium font-semibold
// 7. text-foreground text-muted-foreground
// 8. bg-background bg-card
// 9. flex flex-col (wait, flex is display: flex, flex-col is flex-direction: column - that does NOT conflict)
// 10. w-full w-auto
// 11. h-full h-screen
// 12. items-center items-start
// 13. justify-between justify-center
// 14. transition transition-all or transition-colors
// 15. shadow shadow-md
// 16. gap-2 gap-4
// 17. col-span-* vs col-*
// 18. ring vs ring-*

// Let's map base classes to the exact CSS properties they set:
function getCssProps(cls) {
  const props = new Set();
  
  // Padding
  if (/^p-(\d+|\[.*\])/.test(cls)) {
    props.add('padding-top');
    props.add('padding-bottom');
    props.add('padding-left');
    props.add('padding-right');
  } else if (/^px-(\d+|\[.*\])/.test(cls)) {
    props.add('padding-left');
    props.add('padding-right');
  } else if (/^py-(\d+|\[.*\])/.test(cls)) {
    props.add('padding-top');
    props.add('padding-bottom');
  } else if (/^pt-(\d+|\[.*\])/.test(cls)) {
    props.add('padding-top');
  } else if (/^pb-(\d+|\[.*\])/.test(cls)) {
    props.add('padding-bottom');
  } else if (/^pl-(\d+|\[.*\])/.test(cls)) {
    props.add('padding-left');
  } else if (/^pr-(\d+|\[.*\])/.test(cls)) {
    props.add('padding-right');
  }

  // Margin
  if (/^m-(\d+|auto|\[.*\])/.test(cls)) {
    props.add('margin-top');
    props.add('margin-bottom');
    props.add('margin-left');
    props.add('margin-right');
  } else if (/^mx-(\d+|auto|\[.*\])/.test(cls)) {
    props.add('margin-left');
    props.add('margin-right');
  } else if (/^my-(\d+|auto|\[.*\])/.test(cls)) {
    props.add('margin-top');
    props.add('margin-bottom');
  } else if (/^mt-(\d+|auto|\[.*\])/.test(cls)) {
    props.add('margin-top');
  } else if (/^mb-(\d+|auto|\[.*\])/.test(cls)) {
    props.add('margin-bottom');
  } else if (/^ml-(\d+|auto|\[.*\])/.test(cls)) {
    props.add('margin-left');
  } else if (/^mr-(\d+|auto|\[.*\])/.test(cls)) {
    props.add('margin-right');
  }

  // Font size / line-height
  if (/^text-(xs|sm|base|lg|xl|[2-9]xl)$/.test(cls) || /^text-\[\d+.*\]$/.test(cls)) {
    props.add('font-size');
    props.add('line-height');
  }

  // Font weight
  if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(cls)) {
    props.add('font-weight');
  }

  // Text alignment
  if (/^text-(left|center|right|justify|start|end)$/.test(cls)) {
    props.add('text-align');
  }

  // Text color
  // Any text- that is NOT font size, text align, or text wrap
  if (cls.startsWith('text-') && !/^text-(xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty)/.test(cls) && !/^text-\[\d+.*\]$/.test(cls)) {
    props.add('color');
  }

  // Background color
  if (cls.startsWith('bg-') && !/^bg-(repeat|no-repeat|auto|cover|contain|bottom|top|center|left|right|clip-[a-z]+)/.test(cls)) {
    props.add('background-color');
  }

  // Width
  if (/^w-(\d+|auto|full|screen|min|max|fit|\[.*\]|\d+\/\d+)$/.test(cls)) {
    props.add('width');
  }

  // Height
  if (/^h-(\d+|auto|full|screen|min|max|fit|\[.*\]|\d+\/\d+)$/.test(cls)) {
    props.add('height');
  }

  // Display
  if (/^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents)$/.test(cls)) {
    props.add('display');
  }

  // Position
  if (/^(static|fixed|absolute|relative|sticky)$/.test(cls)) {
    props.add('position');
  }

  // Border width
  if (/^border(-0|-2|-4|-8)?$/.test(cls)) {
    props.add('border-width');
  } else if (/^border-(t|b|l|r)(-0|-2|-4|-8)?$/.test(cls)) {
    const side = cls.split('-')[1];
    props.add(`border-${side === 't' ? 'top' : side === 'b' ? 'bottom' : side === 'l' ? 'left' : 'right'}-width`);
  }

  // Border color
  if (cls.startsWith('border-') && !/^(border-(0|2|4|8|t|b|l|r|x|y|solid|dashed|dotted|double|none))$/.test(cls)) {
    props.add('border-color');
  }

  // Rounded
  if (/^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full|\[.*\])?$/.test(cls)) {
    props.add('border-radius');
  }

  // Overflow
  if (/^overflow-(auto|hidden|clip|visible|scroll)$/.test(cls)) {
    props.add('overflow-x');
    props.add('overflow-y');
  } else if (/^overflow-x-(auto|hidden|clip|visible|scroll)$/.test(cls)) {
    props.add('overflow-x');
  } else if (/^overflow-y-(auto|hidden|clip|visible|scroll)$/.test(cls)) {
    props.add('overflow-y');
  }

  // Gap
  if (/^gap-(\d+|\[.*\])$/.test(cls)) {
    props.add('gap');
  } else if (/^gap-x-(\d+|\[.*\])$/.test(cls)) {
    props.add('column-gap');
  } else if (/^gap-y-(\d+|\[.*\])$/.test(cls)) {
    props.add('row-gap');
  }

  // Justify / Items
  if (/^justify-(normal|start|end|center|between|around|evenly|stretch)$/.test(cls)) {
    props.add('justify-content');
  }
  if (/^items-(start|end|center|baseline|stretch)$/.test(cls)) {
    props.add('align-items');
  }

  // Shadow
  if (/^shadow(-none|-sm|-md|-lg|-xl|-2xl|-inner)?$/.test(cls)) {
    props.add('box-shadow');
  }

  // Tracking (letter-spacing)
  if (/^tracking-(tighter|tight|normal|wide|wider|widest)$/.test(cls)) {
    props.add('letter-spacing');
  }

  // Leading (line-height)
  if (/^leading-(none|tight|snug|normal|relaxed|loose|\d+|\[.*\])$/.test(cls)) {
    props.add('line-height');
  }

  // Transition
  if (/^transition(-all|-colors|-opacity|-shadow|-transform)?$/.test(cls)) {
    props.add('transition-property');
  }

  return props;
}

let allConflicts = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match string literals
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
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          if (a.full === b.full) continue;

          const propsA = getCssProps(a.base);
          const propsB = getCssProps(b.base);

          const shared = [...propsA].filter(p => propsB.has(p));
          if (shared.length > 0) {
            allConflicts.push({
              file,
              variant,
              a: a.full,
              b: b.full,
              props: shared.join(', '),
              raw
            });
          }
        }
      }
    });
  }
});

console.log(`Total exact CSS property conflicts: ${allConflicts.length}`);
allConflicts.forEach((c, idx) => {
  console.log(`${idx + 1}. [${c.props}] in ${c.file} (${c.variant || 'base'}): "${c.a}" vs "${c.b}"\n   Context: "${c.raw.slice(0, 80)}..."`);
});
