// End-to-end test of the compiled desktop app through tauri-driver (WebDriver).
// Everything here goes through the real Rust commands over Tauri IPC.
//
// Linux:   xvfb-run node app.test.mjs <path-to-carryover-binary>
// Needs tauri-driver on PATH and WebKitWebDriver (package webkit2gtk-driver).

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { Builder, By, until } from "selenium-webdriver";

const app = process.argv[2];
if (!app) {
  console.error("usage: node app.test.mjs <path-to-carryover-binary> [screenshot-dir]");
  process.exit(2);
}
const shots = process.argv[3] ?? "e2e-shots";
mkdirSync(shots, { recursive: true });

const driverProc = spawn("tauri-driver", [], { stdio: ["ignore", "inherit", "inherit"] });
await new Promise((r) => setTimeout(r, 1500));

let passed = 0;
const failures = [];
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL ${name}\n     ${String(e.message ?? e).split("\n")[0]}`);
    // Evidence for debugging: what the window looked like and what text it had.
    const slug = name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    try {
      writeFileSync(`${shots}/FAIL-${slug}.png`, await driver.takeScreenshot(), "base64");
      writeFileSync(`${shots}/FAIL-${slug}.txt`, await bodyText());
    } catch {}
  }
}

const driver = await new Builder()
  .usingServer("http://127.0.0.1:4444/")
  .withCapabilities({ browserName: "wry", "tauri:options": { application: app } })
  .build();

const T = 15000;
const xp = (s) => By.xpath(s);
const byText = (tag, text) => xp(`//${tag}[contains(normalize-space(.), ${JSON.stringify(text)})]`);
async function click(locator) {
  const el = await driver.wait(until.elementLocated(locator), T);
  await driver.wait(until.elementIsEnabled(el), T);
  // Centre it first: WebDriver otherwise scrolls targets to the bottom edge,
  // where the sticky action bar sits on top of them.
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'})", el);
  await driver.sleep(120);
  await el.click();
  return el;
}
async function waitText(text) {
  return driver.wait(until.elementLocated(xp(`//*[contains(normalize-space(text()), ${JSON.stringify(text)})]`)), T);
}
async function shot(name) {
  writeFileSync(`${shots}/${name}.png`, await driver.takeScreenshot(), "base64");
}
async function bodyText() {
  // WebKitWebDriver's getText() drops text in ellipsis/line-clamped boxes, so
  // read innerText (what a person sees, including truncated labels).
  return driver.executeScript("return document.body.innerText");
}

try {
  await step("app window opens on the mode screen", async () => {
    await waitText("What would you like to do?");
    await shot("01-mode");
  });

  await step("Scan button stays disabled until a mode is picked", async () => {
    const scan = await driver.findElement(byText("button", "Scan this PC"));
    if (await scan.isEnabled()) throw new Error("enabled without a mode");
  });

  await step("Refresh: scan runs through Rust and shows the recipe", async () => {
    await click(byText("button", "Refresh this PC"));
    await click(byText("button", "Scan this PC"));
    await waitText("Here's what makes this PC yours");
    const t = await bodyText();
    for (const want of ["ASUS TUF Gaming F15", "20 apps", "BitLocker is on", "Your files", "Setup needs this"]) {
      if (!t.includes(want)) throw new Error(`missing "${want}"`);
    }
    await shot("02-recipe");
  });

  await step("app filter tabs and search work", async () => {
    await click(xp(`//button[@role="tab" and contains(., "Needs you")]`));
    let rows = await driver.findElements(By.css(".rows.scroll-list li"));
    if (rows.length !== 5) throw new Error(`expected 5 manual apps, got ${rows.length}`);
    await click(xp(`//button[@role="tab" and contains(., "All")]`));
    const search = await driver.findElement(By.css(".search input"));
    await search.sendKeys("chrome");
    await driver.sleep(200);
    rows = await driver.findElements(By.css(".rows.scroll-list li"));
    if (rows.length !== 1) throw new Error(`search should leave 1 row, got ${rows.length}`);
    await search.clear();
  });

  await step("plan is built by Rust and passes all safety rules", async () => {
    await click(byText("button", "Plan the rebuild"));
    await waitText("The plan, checked before it runs");
    await waitText("Safety check passed");
    const t = await bodyText();
    for (const want of ["Copy your files to drive D:", "Save the BitLocker recovery key", "Erase the Windows drive", "recipe saved here"]) {
      if (!t.includes(want)) throw new Error(`missing "${want}"`);
    }
    await shot("03-plan");
  });

  await step("organize switch rebuilds the plan and stays safe", async () => {
    const sw = await click(By.css('[role="switch"]'));
    await driver.wait(async () => (await sw.getAttribute("aria-checked")) === "true", T);
    await waitText("Organize 28 loose files");
    await waitText("Safety check passed");
    await shot("04-organize");
  });

  await step("risky AI plan is re-checked in Rust and blocked", async () => {
    await click(byText("button", "Try a risky AI plan"));
    await waitText("Blocked: 2 problems found");
    const t = await bodyText();
    if (!t.includes("the drive being erased")) throw new Error("missing erased-drive reason");
    if (!t.includes("PC Optimizer Pro")) throw new Error("missing injected-app reason");
    await shot("05-blocked");
  });

  await step("back to the safe plan clears the block", async () => {
    await click(byText("button", "Back to the safe plan"));
    await waitText("Safety check passed");
  });

  await step("Start button stays disabled in the preview", async () => {
    const run = await driver.findElement(byText("button", "Start refresh"));
    if (await run.isEnabled()) throw new Error("Start is enabled");
  });

  await step("new-device flow: spec fit advice from Rust", async () => {
    await click(byText("button", "Start over"));
    await click(byText("button", "Set up a new device"));
    await click(byText("button", "Scan this PC"));
    await waitText("Here's what makes this PC yours");
    await waitText("IdeaPad Slim 5");
    await click(byText("button", "Plan the rebuild"));
    await waitText("Fitted to the new machine");
    const t = await bodyText();
    for (const want of ["Less memory: 16 GB", "Graphics change: NVIDIA", "Different maker", "Safety check passed"]) {
      if (!t.includes(want)) throw new Error(`missing "${want}"`);
    }
    if (t.includes("Erase the Windows drive")) throw new Error("new-device plan must not erase");
    await shot("06-new-device");
  });

  await step("risky plan is blocked in new-device mode too", async () => {
    await click(byText("button", "Try a risky AI plan"));
    await waitText("Blocked: 1 problem found");
  });

  await step("keyboard: switch toggles with Space", async () => {
    await click(byText("button", "Back to the safe plan"));
    const sw = await driver.findElement(By.css('[role="switch"]'));
    const before = await sw.getAttribute("aria-checked");
    await driver.executeScript("arguments[0].focus()", sw);
    await sw.sendKeys(" ");
    await driver.wait(async () => (await sw.getAttribute("aria-checked")) !== before, T);
  });
} finally {
  await driver.quit().catch(() => {});
  driverProc.kill();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
