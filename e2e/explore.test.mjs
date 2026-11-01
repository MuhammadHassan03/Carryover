// Exploratory end-to-end checks: the things impatient people do.
// Same setup as app.test.mjs:  xvfb-run node explore.test.mjs <binary> [shots]

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { Builder, By, until } from "selenium-webdriver";

const app = process.argv[2];
const shots = process.argv[3] ?? "explore-shots";
mkdirSync(shots, { recursive: true });
const driverProc = spawn("tauri-driver", [], { stdio: ["ignore", "inherit", "inherit"] });
await new Promise((r) => setTimeout(r, 1500));

let passed = 0;
const failures = [];
const T = 15000;
const driver = await new Builder()
  .usingServer("http://127.0.0.1:4444/")
  .withCapabilities({ browserName: "wry", "tauri:options": { application: app } })
  .build();

const xp = (s) => By.xpath(s);
const byText = (tag, text) => xp(`//${tag}[contains(normalize-space(.), ${JSON.stringify(text)})]`);
const shot = async (name) => writeFileSync(`${shots}/${name}.png`, await driver.takeScreenshot(), "base64");
const text = () => driver.executeScript("return document.body.innerText");
async function click(locator) {
  const el = await driver.wait(until.elementLocated(locator), T);
  await driver.wait(until.elementIsEnabled(el), T);
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center', behavior: 'instant'})", el);
  await driver.sleep(80);
  await el.click();
  return el;
}
const waitText = (t) => driver.wait(until.elementLocated(xp(`//*[contains(normalize-space(text()), ${JSON.stringify(t)})]`)), T);
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL ${name}\n     ${String(e.message ?? e).split("\n")[0]}`);
    const slug = name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    try {
      await shot(`FAIL-${slug}`);
    } catch {}
  }
}
async function home() {
  const again = await driver.findElements(byText("button", "Start over"));
  if (again.length) await again[0].click();
  await waitText("What would you like to do?");
}
// Horizontal overflow inside the scrolling main pane or the page itself.
const overflowX = () =>
  driver.executeScript(`
    const m = document.querySelector('.main');
    const d = document.documentElement;
    return Math.max(m.scrollWidth - m.clientWidth, d.scrollWidth - d.clientWidth);`);

try {
  await waitText("What would you like to do?");

  await step("Start over in the middle of a scan stays on the start screen", async () => {
    await click(byText("button", "Refresh this PC"));
    await click(byText("button", "Scan this PC"));
    await waitText("Scanning this PC");
    await click(byText("button", "Start over"));
    await waitText("What would you like to do?");
    await driver.sleep(2500); // longer than a demo scan takes
    const t = await text();
    if (!t.includes("What would you like to do?")) throw new Error("the finished scan pulled the app away from the start screen");
  });

  await step("double-clicking Scan starts only one scan", async () => {
    await home();
    await click(byText("button", "Set up a new device"));
    const scan = await driver.findElement(byText("button", "Scan this PC"));
    await driver.executeScript("arguments[0].click(); arguments[0].click();", scan);
    await waitText("Here's what makes this PC yours");
  });

  await step("rapid organize toggling: switch and plan always agree", async () => {
    await click(byText("button", "Plan the rebuild"));
    await waitText("Safety check passed");
    const sw = await driver.findElement(By.css('[role="switch"]'));
    for (let i = 0; i < 5; i++) await driver.executeScript("arguments[0].click()", sw);
    await driver.sleep(2500);
    const on = (await sw.getAttribute("aria-checked")) === "true";
    const hasStep = (await text()).includes("loose files");
    if (on !== hasStep) throw new Error(`switch says ${on ? "on" : "off"} but plan ${hasStep ? "has" : "lacks"} the organize step`);
  });

  await step("donate link with no browser available doesn't break the app", async () => {
    await click(byText("a", "Donate via PCRF"));
    await driver.sleep(1200);
    const handles = await driver.getAllWindowHandles();
    await driver.switchTo().window(handles[0]);
    const t = await text();
    if (!t.includes("Plan & safety")) throw new Error("app no longer shows the plan screen");
    await click(byText("button", "Back to recipe"));
    await waitText("Here's what makes this PC yours");
  });

  await step("keyboard only: Tab reaches the main action and Enter works", async () => {
    await home();
    await driver.executeScript("document.activeElement && document.activeElement.blur()");
    let reached = false;
    for (let i = 0; i < 25 && !reached; i++) {
      await driver.actions().sendKeys("").perform(); // Tab
      const label = await driver.executeScript("return document.activeElement && document.activeElement.innerText");
      if ((label || "").includes("Refresh this PC")) reached = true;
    }
    if (!reached) throw new Error("Tab never reached the Refresh card");
    await driver.actions().sendKeys("").perform(); // Enter selects
    const visible = await driver.executeScript(
      "const s = getComputedStyle(document.activeElement); return s.boxShadow !== 'none' || s.outlineStyle !== 'none';",
    );
    if (!visible) throw new Error("focused element has no visible focus ring");
    const scanBtn = await driver.findElement(byText("button", "Scan this PC"));
    if (!(await scanBtn.isEnabled())) throw new Error("Enter didn't select the mode");
  });

  await step("smallest window (980x660): no sideways scrolling on any screen", async () => {
    await driver.manage().window().setRect({ width: 980, height: 660 });
    await driver.sleep(400);
    await home();
    let worst = await overflowX();
    await shot("min-1-mode");
    await click(byText("button", "Refresh this PC"));
    await click(byText("button", "Scan this PC"));
    await waitText("Here's what makes this PC yours");
    await driver.sleep(300);
    worst = Math.max(worst, await overflowX());
    await shot("min-2-recipe");
    await click(byText("button", "Plan the rebuild"));
    await waitText("Safety check passed");
    await click(By.css('[role="switch"]'));
    await driver.sleep(800);
    worst = Math.max(worst, await overflowX());
    await shot("min-3-plan");
    if (worst > 1) throw new Error(`content is ${worst}px wider than the window`);
  });
} finally {
  await driver.quit().catch(() => {});
  driverProc.kill();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
