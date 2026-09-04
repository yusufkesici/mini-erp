# mini-erp subagent'ları

Bu dizindeki her `.md` dosyası bir subagent tanımı. Üçü de aynı çıktı formatını
(`ReportFindings`) kullanır ve **bulguları raporlar, kendiliğinden düzeltmez** —
düzeltme her zaman ana konuşmada, açıkça istendiğinde yapılır.

## Hangi agent ne zaman?

| Agent | Ne zaman kullan | Kapsam dışı |
|---|---|---|
| **code-reviewer** | Bir özellik/bugfix yazıldıktan sonra ya da "kod incelemesi yap" dendiğinde. Backend (NestJS servis/controller/CLI) ve frontend (React+antd) kod sağlığını, clean code uyumunu, ölü kodu, DRY ihlallerini, proje konvansiyonlarına (CLAUDE.md) aykırılıkları bulur. | Veritabanı şeması, güvenlik açıkları — bunlar için aşağıdaki iki agent'a yönlendirir. |
| **db-schema-reviewer** | `prisma/schema.prisma` değiştikten sonra ya da "şema incelemesi yap" dendiğinde. Referential integrity (`onDelete` stratejileri), unique/index kapsamı, veri tipi tutarlılığı, migration/şema drift, yorumda belgeli ama DB'de zorlanmayan iş kuralları. | İş mantığı hataları (servis katmanı) — kısa not düşer, derinlemesine incelemez; `code-reviewer`'a yönlendirir. |
| **api-security-reviewer** | Yeni bir controller/endpoint eklendikten sonra ya da "güvenlik incelemesi yap" dendiğinde. SQL/injection yüzeyi, input validation, authentication/authorization eksikliği, mass assignment, bilgi sızıntısı, CORS, rate limiting — tüm `*.controller.ts` uç noktaları. | Genel kod kalitesi ve DB şeması — diğer iki agent'a bırakır. |

## Ortak davranış kalıpları

- Her üçü de **yanlış pozitif üretmemeye** özellikle dikkat eder: CLAUDE.md'de
  bilinçli olduğu belgelenmiş kararları (örn. soft-delete tutarsızlığı,
  ledger tablolarında `updatedAt` olmaması) hata olarak raporlamaz.
- İddialarını taze bir Grep/okuma ile doğrular — önceki bir incelemeden
  "hatırlıyormuş" gibi davranmaz, çünkü kod her seferinde değişmiş olabilir.
- Salt-okunur komutlar (`tsc --noEmit`, `npm run lint`, `npx prisma validate`)
  çalıştırabilir ama asla kod/şema/veri değiştiren bir komut çalıştırmaz.
- Kapsam belirtilmemişse ilgili alanın tamamını tarar (tek dosya değil).

## Sıralı/birleştirilmiş inceleme

Üçünü art arda çalıştırıp bulguları tek bir önceliklendirilmiş listede
birleştirmek istersen: önce `code-reviewer`, sonra `api-security-reviewer`,
sonra `db-schema-reviewer` sırasını kullan (kapsamları en genişten en dara
gider) ve sonuçta ciddiyet (Kritik → Yüksek → Orta → Düşük) bazında tekilleştir.

## Not: bu dizin `.gitignore`'da

`.claude/` kök `.gitignore`'da hariç tutulmuş durumda, yani bu dizindeki
agent tanımları ve bu README normal `git commit`'lere dahil olmuyor —
yalnızca bu makinede/bu checkout'ta yaşıyorlar. Ekip genelinde paylaşmak
istersen `.gitignore`'daki `/.claude` satırını gözden geçirmek gerekir.
