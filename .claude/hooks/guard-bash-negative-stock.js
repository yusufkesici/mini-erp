#!/usr/bin/env node
// PreToolUse (Bash): stok miktarını doğrudan negatif değere set etmeye çalışan
// ham SQL / HTTP (curl) / CLI komutlarını engeller — "doğrudan veri manipülasyonu"
// yoluyla negatif stok yazılmasına karşı koruma (kod içindeki @Min(0) doğrulamasını
// tamamen atlayan yollar: psql, prisma db execute, curl, npm run cli).
let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    process.exit(0);
  }

  const cmd = input.tool_input?.command ?? '';
  if (!cmd) process.exit(0);

  const stockish = /stock/i.test(cmd);
  const negativeQuantity =
    /quantity\\?['"]?\s*[:=]\s*-\s*\d/i.test(cmd) || // quantity: -5 | quantity=-5 | "quantity":-5 | \"quantity\":-5 (kabuk içine gömülü JSON)
    /--quantity[\s=]+-\d/i.test(cmd); // --quantity -5 | --quantity=-5

  const rawSqlUpdate = /update\s+["'`]?stocks?["'`]?\s+set[\s\S]*quantity\s*=\s*-\s*\d/i.test(cmd);
  const rawSqlInsert = /insert\s+into\s+["'`]?stocks?["'`]?[\s\S]*quantity[\s\S]*-\s*\d/i.test(cmd);

  const blocked = rawSqlUpdate || rawSqlInsert || (stockish && negativeQuantity);

  if (blocked) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Stok bütünlüğü koruması: stok miktarını doğrudan negatif değere set etmeye çalışan bir komut engellendi: ${cmd}`,
        },
      }),
    );
  }
  process.exit(0);
});
