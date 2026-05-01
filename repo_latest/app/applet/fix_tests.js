const fs = require('fs');
let content = fs.readFileSync('tests/agent/agent.test.ts', 'utf8');
content = content.replace(/it\('([^']+)', \(\) => \{/g, "it('$1', async () => {");
content = content.replace(/const r = agent.process/g, "const r = await agent.process");
fs.writeFileSync('tests/agent/agent.test.ts', content);
