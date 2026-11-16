const fs = require('fs');
const path = 'C:\\Users\\vijay\\Downloads\\3kBkIreSXEar3bdW-grok-workspace\\src\\components\\mess-app.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
const newLines = [];
let removed = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('CompileBox')) {
    console.log('Removing line ' + (i + 1) + ': ' + lines[i].trim());
    removed++;
  } else {
    newLines.push(lines[i]);
  }
}
fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Done. Removed ' + removed + ' lines.');
console.log('Total lines now: ' + newLines.length);