const fs = require('fs');
let code = fs.readFileSync('src/pages/Vendas.tsx', 'utf8');

code = code.replace(/<Badge className=\{`text-xs \$\{statusColors\[v\.status || ""\]\}`\}>\{v\.status || ""\}<\/Badge>/, '');
fs.writeFileSync('src/pages/Vendas.tsx', code);
