# Storyboard Shot Builder — نسخه رایگان

یک وب‌اپ استاتیک برای ساخت شات‌لیست و مشخصات استوری‌بورد، بدون بک‌اند و بدون API پولی.

## امکانات نسخه 1
- ساخت چند پلان
- Scene / Shot Number / Duration
- Shot Size، Camera Angle، Height، Lens، Focus، Camera Movement
- Composition، Subject، Performance، Lighting، Props
- Dialogue، VO، SFX، Music
- Transition In/Out و Notes
- ذخیره خودکار در مرورگر با localStorage
- افزودن تصویر مرجع برای هر پلان
- Export / Import به JSON
- Print / Save as PDF
- رابط Responsive برای موبایل و دسکتاپ

## اجرای محلی
فایل `index.html` را باز کنید. برای بهترین نتیجه، با یک سرور محلی ساده اجرا کنید:

```bash
python -m http.server 8000
```

بعد:
http://localhost:8000

## انتشار رایگان — پیشنهاد اصلی: Cloudflare Pages
چون این پروژه فقط HTML/CSS/JS است، بدون Functions اجرا می‌شود و درخواست‌های static assets در Cloudflare Pages رایگان و نامحدود هستند (طبق مستندات فعلی Cloudflare).

راه ساده:
1. یک اکانت رایگان GitHub بسازید.
2. این سه فایل را در یک Repository قرار دهید.
3. در Cloudflare Pages، Repository را Connect کنید.
4. Build command را خالی بگذارید.
5. Output directory را `/` یا root پروژه قرار دهید.
6. Deploy.

## GitHub Pages
برای نمونه شخصی/آزمایشی نیز مناسب است. ولی GitHub Pages برای اجرای SaaS تجاری به‌عنوان سرویس رایگان محدودیت سیاستی دارد؛ بنابراین برای اپ عمومی، Cloudflare Pages انتخاب بهتری است.

## درباره AI
تولید تصویر AI عمداً در نسخه رایگان اولیه قرار نگرفته، چون سرویس‌های باکیفیت تولید تصویر معمولاً هزینه API دارند.
مسیر رایگان:
- کاربر تصویر استوری‌بورد را دستی Upload کند.
- یا بعداً یک مدل local/open-source به نسخه دسکتاپ اضافه شود.
- یا قابلیت AI به‌صورت اختیاری با API Key خود کاربر اضافه شود، بدون هزینه برای مالک اپ.
