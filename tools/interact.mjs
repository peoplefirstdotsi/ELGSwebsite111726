// Exercises the real controls and their consequences, desktop and small phone.
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
const URL = process.argv[2] || "http://localhost:4510";
const OUT = process.argv[3] || "lab/interact";
import fs from "node:fs"; fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }).catch(() => chromium.launch({ channel: "chrome", args: ["--no-sandbox"] }));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`); };
async function run(label, vw, vh, mobile) {
  console.log(`\n${label} ${vw}x${vh}`);
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  const errors = [], failed = [], nav = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => { if (r.status() >= 400) failed.push(r.status() + " " + r.url()); });
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const at = async (t) => { await page.evaluate((t) => scrollTo({ top: Math.round(t * innerHeight), behavior: "instant" }), t); await page.waitForTimeout(900); };

  ok("no horizontal overflow", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  // every copy block fits between the bar and the book at its own midpoint
  const mids = [0, 1.95, 3.25, 4.55, 6.2, 7.8, 9.1, 12.05];
  for (let i = 0; i < mids.length; i++) {
    await at(mids[i]);
    const r = await page.evaluate((i) => {
      const b = document.querySelectorAll("[data-sc-copy]")[i].getBoundingClientRect();
      const bar = document.querySelector(".bar").getBoundingClientRect();
      const book = document.querySelector(".book").getBoundingClientRect();
      // measure the things inside the block, not its max-width box
      const kids = [...document.querySelectorAll("[data-sc-copy]")[i].querySelectorAll("h1,h2,h3,p,a,button,label,li")].map((k) => { const r = document.createRange(); r.selectNodeContents(k); return r.getBoundingClientRect(); });
      const overlapsBook = kids.some((k) => k.width && !(k.right <= book.left || k.left >= book.right || k.bottom <= book.top || k.top >= book.bottom));
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), bar: Math.round(bar.bottom), bookTop: Math.round(book.top), overlapsBook, op: document.querySelectorAll("[data-sc-copy]")[i].style.opacity };
    }, i);
    ok(`block ${i + 1} visible, clear of bar and book`, +r.op > 0.95 && r.top >= r.bar - 2 && !r.overlapsBook, JSON.stringify(r));
    if (i === 2 || i === 7 || i === 6) await page.screenshot({ path: `${OUT}/${label}-block${i + 1}.png` });
  }

  // chips carry into the form
  await at(3.25);
  await page.locator('input[name="fit"][value="planting a church"]').check({ force: true });
  const ans = await page.locator(".fit__answer").textContent();
  ok("chip answers", /Planting a church\? Then use that/.test(ans), ans.slice(0, 50));
  if (mobile) { /* the bar's own button is hidden on a phone; use the hero's */ await at(0); await page.locator(".hero .btn").click(); }
  else await page.locator(".bar__talk").click();
  await page.waitForTimeout(300);
  ok("talk dialog opens", await page.evaluate(() => document.getElementById("talk").open));
  ok("chip carried into the message", (await page.locator('textarea[name="Message"]').inputValue()) === "I am currently planting a church.");
  await page.screenshot({ path: `${OUT}/${label}-talk.png` });
  // required fields block an empty submit
  await page.locator('#talk-form button[type="submit"]').click();
  ok("empty form does not claim success", await page.evaluate(() => document.querySelector(".talk__status").hidden));
  // a filled form composes a mailto and says exactly that
  await page.evaluate(() => { window.__href = null; const d = Object.getOwnPropertyDescriptor(Location.prototype, "href"); });
  await page.fill('input[name="Name"]', "Test Person");
  await page.fill('input[name="Email"]', "test@example.org");
  let mailto = null;
  page.on("framenavigated", () => {});
  await page.route("mailto:**", (r) => r.abort()).catch(() => {});
  const [req] = await Promise.all([
    page.waitForEvent("request", { predicate: (r) => r.url().startsWith("mailto:"), timeout: 3000 }).catch(() => null),
    page.locator('#talk-form button[type="submit"]').click(),
  ]);
  mailto = req && req.url();
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => { const s = document.querySelector(".talk__status"); return { hidden: s.hidden, text: s.textContent }; });
  ok("status tells the truth after submit", !st.hidden && /not sent until you press send/.test(st.text));
  if (mailto) ok("mailto addressed to admissions with the fields", /^mailto:Team@ELGS\.org\?subject=/.test(mailto) && /Name%3A%20Test%20Person/.test(mailto) && /planting%20a%20church/.test(mailto), mailto.slice(0, 70));
  else console.log("  NOTE  mailto navigation not observable in this browser context");
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  ok("Escape closes the dialog", await page.evaluate(() => !document.getElementById("talk").open));

  // the book
  await at(1.95);
  if (!(await page.evaluate(() => document.querySelector(".book").hasAttribute("data-open")))) await page.locator(".book__toggle").click();
  await page.locator('input[name="gift"][value="300"]').check({ force: true });
  ok("$300 a month = a full year", /\$300 a month equals a full year/.test(await page.locator(".gift__out").textContent()));
  await page.locator('input[name="gift"][value="25"]').check({ force: true });
  ok("$25 a month = 1 month", /\$25 a month equals 1 month of/.test(await page.locator(".gift__out").textContent()));
  await page.screenshot({ path: `${OUT}/${label}-book.png` });
  await page.locator(".book__toggle").click();
  const give = await page.locator(".book__give").evaluate((a) => [a.href, a.target, a.rel]);
  ok("Give now goes to Givebutter in a new tab", give[0] === "https://givebutter.com/ELGS" && give[1] === "_blank" && /noopener/.test(give[2]));
  const giveBox = await page.locator(".book__give").boundingBox();
  ok("Give now is on screen", giveBox && giveBox.y >= 0 && giveBox.y + giveBox.height <= vh, JSON.stringify(giveBox && { y: Math.round(giveBox.y), h: Math.round(giveBox.height) }));

  // ledger count grows with travel and is complete at the end
  await page.evaluate(() => { history.scrollRestoration = "manual"; scrollTo(0, 0); });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(600);
  const c0 = await page.locator(".book__count b").textContent();
  await at(6.2); const c1 = await page.locator(".book__count b").textContent();
  await at(12.05); const c2 = await page.locator(".book__count b").textContent();
  ok("ledger stamps as you travel", c0 === "1" && c1 === "5" && c2 === "8", `${c0} -> ${c1} -> ${c2}`);
  await page.locator(".book__ledger").click(); await page.waitForTimeout(300);
  ok("sources dialog opens with 8 entries and the Florida disclosure",
    await page.evaluate(() => document.getElementById("sources").open && document.querySelectorAll(".ledger li").length === 8 && /CH58890/.test(document.querySelector(".disclosure").textContent)));
  await page.screenshot({ path: `${OUT}/${label}-sources.png` });
  await page.keyboard.press("Escape");

  // the route jumps
  if (mobile) await page.locator(".route__toggle").click();
  await page.locator('.route__list a[data-route="4"]').click();
  await page.waitForTimeout(1800);
  const seg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sc-seg").trim());
  ok("route jumps to Commencement", seg === "4", "leg " + seg);
  ok("route marks the current waypoint", await page.evaluate(() => document.querySelector('.route__list a[aria-current="true"]').textContent) === "Commencement");

  // keyboard: tabbing into a faded block brings it into view
  await at(0);
  await page.evaluate(() => document.querySelector(".proofs a").focus());
  await page.waitForTimeout(900);
  ok("focus inside a faded block scrolls it into view", await page.evaluate(() => +document.querySelector(".proofs").closest("[data-sc-copy]").style.opacity > 0.85));

  ok("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  ok("no failed requests", failed.filter((u) => !u.startsWith("mailto:")).length === 0, failed.slice(0, 3).join(" | "));
  await ctx.close();
}
await run("desktop", 1440, 900, false);
await run("laptop", 1280, 680, false);
await run("phone", 390, 844, true);
await run("compact", 360, 640, true);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
