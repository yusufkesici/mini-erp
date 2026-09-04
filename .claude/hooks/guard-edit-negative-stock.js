#!/usr/bin/env node
// PreToolUse (Write|Edit): src/stock*/ altındaki dosyalarda stok miktarını negatif
// yapabilecek kod değişikliklerini engeller — "koddan" saldırı yolu: quantity alanına
// negatif literal atanması, ya da mevcut @Min(0) doğrulamasının kaldırılması.
let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    process.exit(0);
  }

  const toolName = input.tool_name;
  const ti = input.tool_input ?? {};
  const filePath = (ti.file_path ?? '').replace(/\\/g, '/');

  const inScope = /\/src\/stock(-movements)?\//i.test(filePath) || /\/prisma\/schema\.prisma$/i.test(filePath);
  if (!inScope) process.exit(0);

  const hasNegativeLiteral = (text) => /quantity\s*[:=]\s*-\s*\d/i.test(text ?? '');
  const hasMinGuard = (text) => /@Min\(\s*0/i.test(text ?? '');

  let reason = null;

  if (toolName === 'Write') {
    const content = ti.content ?? '';
    if (hasNegativeLiteral(content)) {
      reason = 'Yeni dosya içeriğinde quantity alanına negatif bir literal atanıyor.';
    } else if (/create-stock\.dto\.ts$|create-stock-movement\.dto\.ts$/i.test(filePath) && !hasMinGuard(content)) {
      reason = 'Bu DTO dosyasında quantity alanının @Min(0) doğrulaması eksik/kaldırılmış görünüyor.';
    }
  } else if (toolName === 'Edit') {
    const oldStr = ti.old_string ?? '';
    const newStr = ti.new_string ?? '';
    if (hasNegativeLiteral(newStr)) {
      reason = 'Düzenleme, quantity alanına negatif bir literal atıyor.';
    } else if (hasMinGuard(oldStr) && !hasMinGuard(newStr) && /quantity/i.test(oldStr)) {
      reason = 'Düzenleme, quantity alanındaki @Min(0) doğrulamasını kaldırıyor gibi görünüyor.';
    }
  }

  if (reason) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Stok bütünlüğü koruması: ${reason} (${filePath})`,
        },
      }),
    );
  }
  process.exit(0);
});
