# ملاحظات استعادة قالب Sky Theme — TWSAA (إصلاحات دنيا فقط)

## سياسة الإصلاح

**المسموح:**
- إصلاح RTL وترتيب تحميل CSS الرسمي
- إصلاح أخطاء `main.twig` (syntax / مسارات الإعلان)
- إصلاح مسارات `assets()` للعمل محلياً (مجلد فرعي) **و** على توسّع (production)
- إزالة كتلة CSS inline المخصصة (~1500 سطر Dark Glass) من `main.twig`
- **طبقة Raqam overlay:** Sky Theme يبقى الأساس (كل CSS الرسمي أولاً)، ثم `raqam-theme.css` فوق — **لا استبدال**

**غير مسموح:**
- حذف أو تعطيل CSS الرسمي (bootstrap-ar, ar.css, app.css, …)
- حذف أقسام الفوتر/الهيدر الأصلية
- دالة Twig `url()` جديدة — تستخدم `theme_base|default('')` بدلاً منها

---

## سياسة Overlay (Sky + Raqam)

| الطبقة | الملفات | الدور |
|--------|---------|-------|
| **Base** | bootstrap-ar → fonts → ui → owl → swiper → ar.css → app.css → toastr → vendor CDN | Sky Theme الرسمي |
| **Overlay** | `assets/css/raqam-theme.css` | Raqam Dark Glass — **آخر stylesheet** |
| **Scoping** | `body.raqam-theme` | overrides محصورة داخل class |
| **Background** | `.raqam-space-bg` + `.raqam-stars` | خلفية fixed z-index 0 |

Classes اختيارية: `raqam-theme-header` (navbar home)، `raqam-contact-links` (أيقونات footer).

---

## التشخيص

1. **`main.twig`** كان يحتوي ~1500 سطر CSS مخصص (Dark Glass) يُلغي `ar.css` و`app.css`.
2. **`assets()`** كان يُرجع `/assets/` فقط — لا يعمل داخل مجلد فرعي على XAMPP.
3. **`index.php`** كان يقارن `REQUEST_URI` كاملاً دون طرح مسار المجلد.
4. **`route()` و`getPath()`** معطّلتان في نسخة المعاينة المحلية.
5. **toastr** — يُحمّل من `assets/js/plugins/toastr/` (محلي).

---

## الإصلاحات المُبقاة (minimal)

| الملف | الإصلاح |
|-------|---------|
| `config.php` | **محلي فقط** — `theme_base_path()` و`theme_request_path()` |
| `.htaccess` | **محلي فقط** — توجيه إلى `index.php` |
| `index.php` | **محلي فقط** — `$GLOBALS['theme_base']` + global Twig `theme_base` |
| `src/Twig/CustomTwigExtensions.php` | `assets()` مع `$GLOBALS['theme_base']`؛ `route()`/`getPath()` للمعاينة المحلية فقط |
| `views/layout/main.twig` | ترتيب CSS الرسمي + overlay `raqam-theme.css` + `body.raqam-theme` + space bg |
| `views/layout/header.twig` | `storage_url` للشعار؛ روابط `{{ theme_base\|default('') }}/...` |
| `views/layout/navbar.twig` | AJAX التصنيفات بمسار `theme_base` |
| `views/layout/footer.twig` | روابط `theme_base` (الأقسام الأصلية مُستعادة) |

---

## التوافق مع TWSAA (production)

| العنصر | السلوك على توسّع |
|--------|------------------|
| `getFunction('assets')` | المنصة تُرجع URL كامل — **لا تُستبدل** |
| `theme_base` في Twig | غير مُعرَّف → `default('')` → روابط `/checkout/cart` كالمعتاد |
| `config.php` / `index.php` | **لا تُستخدم** على المنصة |
| `CustomTwigExtensions.php` | المنصة تستخدم امتدادها — دوال القالب للمعاينة المحلية فقط |
| `route()` في `main.twig` | المنصة توفرها — لا تغيير |
| `raqam-theme.css` | **overlay** — بعد كل CSS الرسمي؛ Sky base محفوظ |

---

## تحميل CSS — الترتيب الرسمي

1. `bootstrap-ar.min.css` (أو en)
2. `fonts.css`, `front-fonts.css`
3. `ui.css`
4. Owl Carousel CSS
5. `swiper-bundle.min.css`
6. `ar.css` (أو en) — RTL + الهيدر
7. `app.css`
8. `toastr.min.css` (محلي)
9. vendor CDN (datepicker, bootstrap-select)
10. **`raqam-theme.css`** — overlay (آخر stylesheet)
11. `:root { --brand, --brand-light }` من القناة (inline)

---

## التشغيل على XAMPP

```bash
cd "D:\xampp\htdocs\قالب-منصة توسع\sky-theme-main"
composer install
```

```
http://localhost/قالب-منصة%20توسع/sky-theme-main/
```

تفعيل `mod_rewrite` و`AllowOverride All`.

---

## ما تم **إرجاعه** سابقاً (revert f042f9a3) — ثم **أُعيد overlay**

| التغيير | الحالة الحالية |
|---------|----------------|
| ربط `raqam-theme.css` + `body.raqam-theme` + خلفية النجوم | **مُفعَّل** — overlay فوق Sky base |
| classes `raqam-theme-header`, `raqam-contact-links` | **مُفعَّل** (header/footer — CSS يعتمد عليها) |
| حذف newsletter + scroll-top من الفوتر | **أُستعيد** (Sky sections محفوظة) |
| ~160 سطر side-menu في `app.css` | **أُزيل** (كان إضافة fe93a073) |
| دالة Twig `url()` | **أُزيلت** → `theme_base\|default('')` |

---

## قائمة التحقق

- [ ] Sky CSS الرسمي يُحمّل أولاً (bootstrap-ar → ui → ar → app → toastr)
- [ ] `raqam-theme.css` آخر stylesheet (overlay)
- [ ] `body` يحتوي `raqam-theme` + `rtl`/`ltr`
- [ ] `.raqam-space-bg` موجود (خلفية فضائية)
- [ ] الهيدر RTL: السلة يمين، الشعار وسط، البحث يسار
- [ ] روابط `/checkout/cart` تعمل على production (بدون localhost)
- [ ] روابط تعمل في مجلد فرعي XAMPP (مع `theme_base`)

---

*آخر مراجعة: يوليو 2026 — Sky base + Raqam overlay*
