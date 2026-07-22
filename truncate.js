import fs from 'fs';
const content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');
const lines = content.split('\n');
const newContent = lines.slice(0, 2851).join('\n');
fs.writeFileSync('src/pages/Admin.tsx', newContent);
console.log('Done');