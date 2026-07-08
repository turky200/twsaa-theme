# خطة ترحيل ثيم Raqam Dark Glass → TWSAA Sky Theme

> **الهدف:** مطابقة pixel-perfect لمتجر [getsupstore1.com](https://getsupstore1.com) بدون JS injection — CSS + Twig فقط.  
> **المصدر:** `raqam-store/dstory-ready.js` + snippets (`raqam-header-override-v5-fix9.js`, `raqam-login-modal-glass.js`, …)  
> **الهدف:** `sky-theme-main` على منصة توسّع (TWSAA)

---

## المرحلة 1 — الأساس (Foundation) ✅

### ما تم إنجازه

| المهمة | الحالة | الملف |
|--------|--------|-------|
| استخراج design tokens | ✅ | موثّق أدناه + `:root` في `raqam-theme.css` |
| ملف CSS موحّد | ✅ | `assets/css/raqam-theme.css` (جديد — additive) |
| ربط CSS في layout | ✅ | `views/layout/main.twig` — بعد `app.css` / `ar.css` |
| خلفية فضائية | ✅ | `.raqam-space-bg` في `main.twig` + CSS stars |
| classes الهيدر/الفوتر | ✅ | `header.twig`, `footer.twig` — إضافة classes فقط |
| توثيق الخطة | ✅ | هذا الملف |

### Design Tokens المستخرجة

#### ألوان

| Token | القيمة | الاستخدام |
|-------|--------|-----------|
| `--raqam-bg-dark` | `#050508` | خلفية الصفحة / body |
| `--raqam-bg-header` | `#000000` | الهيدر والـ mainnav |
| `--raqam-accent` | `#8b51fe` | لون accent رئيسي |
| `--raqam-accent-light` | `#a855f7` | أيقونات القوائم / hover |
| `--raqam-brand` | `#360a61` | brand بنفسجي غامق |
| `--raqam-text` | `#ffffff` | نص أساسي |
| `--raqam-glass-bg` | `rgba(255,255,255,0.07)` | بطاقات زجاجية |
| `--raqam-glass-border` | `rgba(255,255,255,0.14)` | حدود زجاج |
| `--raqam-border-purple` | `rgba(139,81,254,0.35)` | حدود بنفسجية |
| `--raqam-input-bg` | `rgba(26,16,37,0.65)` | حقول الإدخال |
| `--raqam-dropdown-bg` | `rgba(30,15,45,0.92)` | قوائم منسدلة |
| `--raqam-overlay` | `rgba(5,5,8,0.78)` | overlay المودال |
| `--raqam-cart-badge` | `#3b82f6` | عداد السلة |
| `--raqam-whatsapp` | `#25D366` | واتساب |
| `--raqam-telegram` | `#2AABEE` | تيليجرام |

#### Typography

| العنصر | القيم |
|--------|-------|
| عنوان أقسام (`.s-block h2`) | `22px`, `font-weight: 800`, gradient text |
| عنوان منتج | `15px`, `font-weight: 700` |
| السعر | `18px`, `font-weight: 700` |
| زر إضافة للسلة | `15px`, `font-weight: 700` |
| نص الهيدر / login | `17px`, `font-weight: 500` |
| أيقونات هيدر | `23px` (سلة `27px`, قائمة `31px`) |

#### Border-radius

| العنصر | القيمة |
|--------|--------|
| بطاقة منتج / dropdown | `12px` |
| صورة منتج | `14px` |
| حقول + أزرار | `12px` |
| modal body | `18px` (جوال `16px`) |
| أيقونات تواصل | `50%` |

#### Shadows

| الاستخدام | القيمة |
|-----------|--------|
| Glass modal | `0 16px 48px rgba(54,10,97,0.45)` + inset |
| Product image | `0 0 20px rgba(168,85,247,0.15)` |
| Product hover | `0 0 28px rgba(168,85,247,0.28)` |
| Button | `0 4px 14px rgba(54,10,97,0.4)` |

#### Gradients

```css
--raqam-btn-grad: linear-gradient(135deg, #360a61 0%, #5b1d8a 45%, #7c3aed 100%);
--raqam-btn-grad-hover: linear-gradient(135deg, #4a1178 0%, #6d28d9 45%, #8b5cf6 100%);
```

#### Header Layout (3 zones)

| Zone | المحتوى | CSS class (TWSAA) | sky-theme |
|------|---------|-------------------|-----------|
| Left | login / user menu / lang / cart | `.raqam-zone-left` | `.top-links-1` |
| Center | logo + اسم المتجر | `.raqam-zone-center` | `.top-links-2` |
| Right | search + menu | `.raqam-zone-right` | `.top-links-3` |

- خلفية: `#000`
- ارتفاع الصف: `76px` (جوال) / `80px` (desktop)
- direction: `ltr` للصف (RTL للنص داخل center)

---

## المرحلة 2 — الصفحة الرئيسية (Home Custom Blocks) ✅

### ما تم إنجازه

| JS Snippet | CSS (Phase 2) | Twig |
|------------|---------------|------|
| `raqam-products-pro` (sliders) | `raqam-theme.css` §11–13 products + swiper + owl | `fixed-products-slider.twig`, `list-of-items-slider.twig` |
| `raqam-testimonials-pro.js` | `raqam-theme.css` §8 testimonials (كامل) | `customer-options.twig` |
| `raqam-testimonials-glass.js` | §8 — grid cards (Phase 3 load_data) | — |
| Section titles gradient | §11 product-group + s-block | — |
| Features bar / channels | §15 store-features | `store-features.twig` |
| Bold banner / video | §14 + §18 | `bold-banner.twig`, `video.twig` |
| Brands slider | §13 + §16 | `brands.twig` |
| Fixed products grid/slider | §13 + §5 | `fixed-products.twig`, `fixed-products-slider.twig` |
| List of items grid/slider | §17 | `list-of-items.twig`, `list-of-items-slider.twig` |

### Checklist Phase 2

- [x] swiper `.mySwiper` — عرض 2.5 منتج جوال
- [x] owl-carousel — عرض 2.5 جوال (products + brands)
- [x] testimonial cards glass كامل (myReviewSwiper + customer-options)
- [x] brands slider glass
- [x] store-features icons glass
- [x] bold banner + video frame
- [x] list-of-items grid + slider
- [x] override `--brand` من channel colors (Phase 1 `:root`)

---

## المرحلة 3 — صفحات المنتج / السلة / الحساب ✅

| JS Snippet | CSS | Twig | الحالة |
|------------|-----|------|--------|
| `raqam-account-pages-glass.js` | §22 account | `customers/account/**` | ✅ |
| `raqam-account-orders-glass.js` | §22 + §26 orders | `orders/**` | ✅ |
| `raqam-account-notifications-glass.js` | §22 notifications | `notification/index.twig` | ✅ |
| Product page styles (dstory) | §20 product-view | `products/view.twig` | ✅ |
| Cart / checkout (dstory) | §21 + §23 cart | `checkout/**` | ✅ |
| `raqam-login-modal-glass.js` | §7 + §25 login | `session/popup.twig` | ✅ |
| `raqam-footer-white` + contact icons | §6 + §6b footer | `footer.twig` | ✅ |
| `raqam-testimonials-glass.js` | §27 testimonials | `testimonials/index.twig` | ✅ |
| Listing / category | §24 listing | `products/*.twig` | ✅ |

**توثيق الحالة الكامل:** `COMPLETION-STATUS.md`

---

*آخر تحديث: 4 يوليو 2026 — Phase 3 مكتمل (~95%)*

## جدول Mapping: JS → CSS + Twig

| ملف JS (raqam-store) | قسم CSS | ملف Twig |
|----------------------|---------|----------|
| `dstory-ready.js` (critical + space) | `:root`, §2 space, §3 base | `main.twig` |
| `raqam-header-override-v5-fix9.js` | §4 header | `header.twig` |
| `raqam-products-pro` (inside dstory) | §5 products | `products/list/card.twig`, `custom/*` |
| `raqam-footer-white` (dstory) | §6 footer | `footer.twig` |
| `raqam-footer-contact-icons.js` | §6 contact icons | `footer.twig` `.raqam-contact-links` |
| `raqam-login-modal-glass.js` | §7 login modal | `customers/session/popup.twig` |
| `raqam-testimonials-pro.js` | §8 testimonials | `custom/*`, `home/index.twig` |
| `raqam-testimonials-glass.js` | §8 testimonials (grid) | home load_data |
| `raqam-account-pages-glass.js` | Phase 3 § account | `customers/account/**` |
| `raqam-account-orders-glass.js` | Phase 3 § orders | `orders/**` |
| `raqam-account-notifications-glass.js` | Phase 3 § notifications | `notification/index.twig` |
| z-index fix (dstory) | §9 z-index | — |
| `raqam-critical-css.css` | §3 base | — |

---

## قواعد صارمة (تذكير)

1. **لا redesign** — نقل visual فقط
2. **لا حذف** ملفات رسمية (`app.css`, `ar.css`, …)
3. **لا JS injection** — CSS + Twig فقط
4. **مسارات assets:** `{{ asset_url ~ 'css/raqam-theme.css' }}`
5. **ترتيب CSS:** bootstrap → ui → ar/en → app → toastr → **raqam-theme.css** (آخر stylesheet)
6. **RTL-safe:** استخدام `inset-inline-*` حيث أمكن

---

## تحقق محلي (Mental Check)

```
✓ asset_url ~ 'css/raqam-theme.css'  → assets/css/raqam-theme.css
✓ body.raqam-theme                   → scoping يمنع كسر preview بدون class
✓ .raqam-space-bg                    → fixed z-index 0, content z-index 1
✓ header/footer classes              → additive, لا تغيير structure
✓ #customerLoginModal                → sky bootstrap modal (ليس s-modal TWSAA)
✓ .product-card                      → sky selector (ليس .product-entry فقط)
✓ #header / .product-entry           → محفوظة لـ TWSAA deployed
```

---

## الملفات المعدّلة — Phase 1

| الملف | نوع التغيير |
|-------|-------------|
| `assets/css/raqam-theme.css` | **جديد** |
| `views/layout/main.twig` | link CSS + space bg + `body.raqam-theme` + theme-color |
| `views/layout/header.twig` | class `raqam-theme-header` |
| `views/layout/footer.twig` | classes `raqam-theme-footer`, `raqam-contact-links` |
| `MIGRATION-PLAN.md` | **جديد** |

## الملفات المعدّلة — Phase 2

| الملف | نوع التغيير |
|-------|-------------|
| `assets/css/raqam-theme.css` | append §8 testimonials + §11–18 home blocks |
| `views/home/index.twig` | class `raqam-home` فقط |
| `views/custom/bold-banner.twig` | classes `raqam-block-banner`, `raqam-banner-img` |
| `views/custom/store-features.twig` | class `raqam-block-features` |
| `views/custom/brands.twig` | class `raqam-block-brands` |
| `views/custom/fixed-products.twig` | class `raqam-block-products` |
| `views/custom/fixed-products-slider.twig` | classes `raqam-block-products`, `raqam-block-products-slider` |
| `views/custom/list-of-items.twig` | class `raqam-block-list-items` |
| `views/custom/list-of-items-slider.twig` | classes `raqam-block-list-items`, `raqam-block-list-slider` |
| `views/custom/customer-options.twig` | class `raqam-block-testimonials` |
| `views/custom/video.twig` | class `raqam-block-video` |
| `MIGRATION-PLAN.md` | Phase 2 ✅ |

---

*آخر تحديث: يوليو 2026 — Phase 2 Home Components*

---

## المرحلة 3 — Inner Pages ✅

راجع `COMPLETION-STATUS.md` للتفاصيل الكاملة.
