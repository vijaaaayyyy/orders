const fs = require('fs');
const path = 'C:\\Users\\vijay\\Downloads\\3kBkIreSXEar3bdW-grok-workspace\\src\\components\\mess-app.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('CompileBox')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
console.log(`Total lines: ${lines.length}`);
"