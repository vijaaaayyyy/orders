import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
const labels = page.locator("span.text-xs.font-semibold.tracking-widest.uppercase", { hasText: /^Cooking$/ });
const n = await labels.count();
console.log("cooking labels:", n);
for (let i = 0; i < n; i++) {
  const info = await labels.nth(i).evaluate((el) => {
    const card = el.closest("article");
    const frame = el.closest(".glass-frame");
    const r = (x) => x && x.getBoundingClientRect();
    const a = r(card), f = r(frame), l = r(el);
    return {
      inArticle: !!card, inFrame: !!frame,
      label: [Math.round(l.left), Math.round(l.top), Math.round(l.right), Math.round(l.bottom)],
      article: a && [Math.round(a.left), Math.round(a.top), Math.round(a.right), Math.round(a.bottom)],
      frame: f && [Math.round(f.left), Math.round(f.top), Math.round(f.right), Math.round(f.bottom)],
    };
  });
  console.log(i, JSON.stringify(info));
}
await labels.first().scrollIntoViewIfNeeded();
await page.screenshot({ path: "/tmp/cooking.png", fullPage: false });
await browser.close();
