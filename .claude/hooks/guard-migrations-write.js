#!/usr/bin/env node
// PreToolUse (Write|Edit): prisma/migrations/ altına doğrudan yazmayı/düzenlemeyi engeller.
// Migration dosyaları yalnızca `npx prisma migrate dev/reset/resolve` üzerinden oluşmalı —
// Claude'un Edit/Write tool'uyla elle migration SQL'i yazması/değiştirmesi hiçbir zaman
// meşru değildir (Prisma CLI bu dosyaları kendi alt sürecinde yazar, bu tool çağrılarından
// geçmez — bu yüzden CLI akışı bu hook'tan etkilenmez).
let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    process.exit(0);
  }

  const filePath = (input.tool_input?.file_path ?? '').replace(/\\/g, '/');
  if (!/\/migrations\//i.test(filePath)) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Migration koruması: migrations/ altına doğrudan yazma/düzenleme engellendi (${filePath}). Yeni migration için "npx prisma migrate dev --name <isim>" komutunu kullan.`,
      },
    }),
  );
  process.exit(0);
});
