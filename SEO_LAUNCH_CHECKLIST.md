# Academy SEO — the two video checklists (21 November 2026)

Website: https://alislaharabicacademy-eng.github.io/al-islah-arabiyya/

The second video covers Google search visibility, sitemap, indexing, relevant local structured data, and Open Graph link previews. The first is a SERPSPRING SEO-themed promotional animation showing crawling/SEO reporting; it is **not** an account setup instruction or a specific tool to install on this Academy.

## 1. Search visibility and relevant keywords
- Static titles and descriptions now identify **Madrasa Al Islahul Arabiya**, **Women's Online Madrasa**, Muallama, Muballigha, Alima, online Islamic Studies, Qur'an and Arabic learning without irrelevant keyword stuffing.
- Public homepage, admissions, course list and course details have consistent HTTPS canonical URLs.
- Google chooses its own ranking and result snippets; adding this metadata does not guarantee instant first-page rankings.

## 2. Sitemap and search discovery
- Public XML sitemap: https://alislaharabicacademy-eng.github.io/al-islah-arabiyya/sitemap.xml
- Only the homepage, admissions, all courses, and course details are included. **NO** student, teacher, admin, exam results lookup or private registration URLs are in the sitemap.
- `robots.txt` is supplied in the project folder for reference/future hosting, but on a GitHub Pages **project site** at a subpath, search robots rules come from the **host root** (`https://alislaharabicacademy-eng.github.io/robots.txt`), not the subfolder copy. It must not be mistaken for root-level robots enforcement. Critical private pages instead carry static noindex tags, while Firebase rules still enforce real authentication.

## 3. Google Search Console: one-time owner verification REQUIRED
The code cannot verify ownership of a Gmail account or request Google indexing without that account's authorization.

1. Sign in at https://search.google.com/search-console/ with the verified Academy Google account.
2. Choose **URL prefix property**: `https://alislaharabicacademy-eng.github.io/al-islah-arabiyya/` (unless a final custom domain is already live — use the real canonical URL).
3. Verify ownership via the Google-provided **HTML tag** or **HTML verification file**, not a fabricated verification token. Add the exact provided token or file through a code review/deploy.
4. In Search Console → **Sitemaps**, submit `sitemap.xml` or the full URL above.
5. Use **URL Inspection** for the homepage, all-courses, admission, course details and **Request indexing** when appropriate.
6. Review **Pages** indexing, **Search results** queries/impressions/clicks, and **Core Web Vitals** once data is available. Google may take time to crawl; no indexing or ranking guarantee.

If a custom domain is added later, update **all** canonical tags, OG URLs, schema `url` and sitemap to the new domain, configure 301 redirects where possible, and use Search Console for the new property.

## 4. Local SEO and structured data
- Homepage now has valid JSON-LD `EducationalOrganization`, `WebSite` and course-list `Course` descriptions supported by public page content.
- It references the Academy's public email, YouTube and Instagram links. No unverified street address, business hours, Google Map listing, reviews, ratings, rich-result eligibility or physical storefront are invented.
- **If** the Academy operates a qualifying physical location with public address and verified Google Business Profile, the owner can provide those **accurate, publicly visible** details before adding `LocalBusiness` markup. An online-only teaching academy should not fake a local storefront.

## 5. WhatsApp, Instagram, Facebook share previews
- Homepage and other public pages expose Open Graph `og:title`, `og:description`, `og:url`, `og:image`, plus Twitter Card metadata.
- The current publicly accessible **official PNG Academy logo** serves as a reliable social thumbnail. A future custom 1200 × 630 JPG/PNG can replace this after the owner approves the design and it is published as a real binary asset.
- Social services cache previews; after deployment, share the canonical link and check the actual preview in WhatsApp/Facebook. No guarantee every app renders the same card.

## SEO maintenance and privacy
- GitHub Actions `Academy SEO Launch Checks` verifies markup, sitemap, JSON-LD and noindex safety on PR, main pushes, and a periodic scheduled run.
- This is a **technical quality check**, not automatic Google indexing or ranking manipulation.
- Login links remain usable by parents, students and staff from the website but are intentionally excluded from Google search.
- Never publish student records, Aadhaar data, phone numbers, teacher personal details, Firebase configuration secrets or administrator credentials in metadata or schema.
- Recommended outside validation after deploy: Google Rich Results Test, Search Console URL Inspection and PageSpeed Insights on the live homepage (especially mobile).
