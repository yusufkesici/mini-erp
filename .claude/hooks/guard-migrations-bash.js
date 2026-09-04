#!/usr/bin/env node
// PreToolUse (Bash): migrations/ klasörünü değiştiren komutları, yalnızca resmi
// "npx prisma migrate dev/reset/resolve/status" çağrısı hariç engeller — rm/mv/cp/touch/
// mkdir/sed -i/redirect gibi doğrudan dosya sistemi manipülasyonlarına karşı. Salt-okunur
// erişim (cat/ls/grep/git log vb.) engellenmez.
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

  if (!/migrations/i.test(cmd)) process.exit(0);

  const trimmed = cmd.trim();
  // İzinli tek çağrı: başka bir komutla zincirlenmemiş (;, &, |) saf bir prisma migrate çağrısı.
  const isAllowedPrismaCommand =
    /^(npx\s+)?prisma\s+migrate\s+(dev|reset|resolve|status)\b/i.test(trimmed) && !/[;&|]/.test(trimmed);
  if (isAllowedPrismaCommand) process.exit(0);

  // Redirect algılamasında `=>` (JS/TS ok fonksiyonu) ve `>=` (karşılaştırma) hariç tutulur —
  // yalnızca gerçek `>`/`>>` gerçek shell redirect'i (öncesinde/sonrasında `=` olmayan) sayılır.
  const looksLikeWrite =
    /(^|[\s;&|(])(rm|rmdir|mv|cp|touch|mkdir|sed)\b/i.test(cmd) ||
    /(?<!=)>>?(?!=)(?!\s*&\s*1)/.test(cmd) ||
    /\btee\b/i.test(cmd);
  if (!looksLikeWrite) process.exit(0); // örn. cat/ls/grep gibi salt-okunur erişim

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Migration koruması: migrations/ klasörünü doğrudan değiştirmeye çalışan bir komut engellendi (yalnızca "npx prisma migrate dev/reset/resolve/status" izinli): ${cmd}`,
      },
    }),
  );
  process.exit(0);
});
