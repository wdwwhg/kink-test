import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const chromeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromeCandidates.find((path) => existsSync(path));
const debugPort = 9223;
const appUrl = "http://127.0.0.1:4321/";
const profileDir = resolve(`.tmp/chrome-profile-${Date.now()}`);
const failures = [];

if (!chromePath) {
  throw new Error("No supported Chromium browser path configured.");
}

await rm(profileDir, { recursive: true, force: true });
await mkdir(profileDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-allow-origins=*",
  "--remote-debugging-address=127.0.0.1",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
]);

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => {
  chromeStderr += chunk.toString();
});

try {
  await waitForChrome();
  const tab = await createTab(appUrl);
  const client = await connectCdp(tab.webSocketDebuggerUrl);

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");

  await verifyViewport(client, 1280, 900, "desktop");
  await verifyViewport(client, 390, 844, "mobile");

  client.close();
} finally {
  chrome.kill();
  await delay(500);
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Browser verification passed: page loads, quiz completes, result renders, and no console errors were detected.");

async function waitForChrome() {
  const endpoint = `http://127.0.0.1:${debugPort}/json/version`;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        return;
      }
    } catch {
      if (chrome.exitCode !== null) {
        throw new Error(
          `Chrome exited before remote debugging started. ${chromeStderr.trim()}`,
        );
      }
      await delay(250);
    }
  }

  throw new Error(`Timed out waiting for Chrome remote debugging. ${chromeStderr.trim()}`);
}

async function createTab(url) {
  const response = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`,
    { method: "PUT" },
  );

  if (!response.ok) {
    throw new Error(`Unable to create Chrome tab: ${response.status}`);
  }

  return response.json();
}

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  const waiters = new Map();
  const consoleErrors = [];
  let id = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      consoleErrors.push(message.params.exceptionDetails.text);
    }

    if (
      message.method === "Runtime.consoleAPICalled" &&
      ["error", "assert"].includes(message.params.type)
    ) {
      consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
    }

    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      consoleErrors.push(message.params.entry.text);
    }

    const eventWaiters = waiters.get(message.method) ?? [];
    for (const waiter of eventWaiters) {
      waiter(message.params);
    }
    waiters.delete(message.method);
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    consoleErrors,
    send(method, params = {}) {
      id += 1;
      socket.send(JSON.stringify({ id, method, params }));

      return new Promise((resolve, reject) => {
        pending.set(id, (message) => {
          if (message.error) {
            reject(new Error(message.error.message));
            return;
          }
          resolve(message.result);
        });
      });
    },
    waitFor(method, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
        const eventWaiters = waiters.get(method) ?? [];
        eventWaiters.push((params) => {
          clearTimeout(timer);
          resolve(params);
        });
        waiters.set(method, eventWaiters);
      });
    },
    async evaluate(expression) {
      const result = await this.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });

      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
      }

      return result.result.value;
    },
    close() {
      socket.close();
    },
  };
}

async function verifyViewport(client, width, height, label) {
  client.consoleErrors.length = 0;
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });

  const loaded = client.waitFor("Page.loadEventFired");
  await client.send("Page.navigate", { url: appUrl });
  await loaded;
  await delay(400);

  const pageState = await client.evaluate(`(() => ({
    bodyLength: document.body.innerText.trim().length,
    h1Count: document.querySelectorAll('h1').length,
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
    answerButtons: document.querySelectorAll('[data-answer-value]').length,
    imageCount: document.images.length,
    missingAltImages: Array.from(document.images).filter((image) => !image.hasAttribute('alt')).length,
    emptyAltImages: Array.from(document.images).filter((image) => image.alt === '').length,
    describedImages: Array.from(document.images).filter((image) => image.alt.length > 0).length,
    brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length,
    overlay: Boolean(document.querySelector('.vite-error-overlay, #webpack-dev-server-client-overlay')),
  }))()`);

  assert(pageState.bodyLength > 1000, `${label}: page body is unexpectedly small`);
  assert(pageState.h1Count === 1, `${label}: expected exactly one H1`);
  assert(pageState.title.includes("Kink Test"), `${label}: title missing Kink Test`);
  assert(pageState.canonical === "https://kinktest.xyz/", `${label}: canonical URL mismatch`);
  assert(pageState.jsonLdCount >= 3, `${label}: expected homepage JSON-LD blocks`);
  assert(pageState.answerButtons === 5, `${label}: answer buttons did not render`);
  assert(pageState.imageCount === 9, `${label}: expected one primary image and eight guide thumbnails`);
  assert(pageState.missingAltImages === 0, `${label}: found images without alt attributes`);
  assert(pageState.emptyAltImages === 8, `${label}: guide thumbnails should use empty alt text`);
  assert(pageState.describedImages === 1, `${label}: homepage primary image needs descriptive alt text`);
  assert(pageState.brokenImages === 0, `${label}: one or more homepage images failed to load`);
  assert(!pageState.overlay, `${label}: dev error overlay detected`);

  const resultState = await client.evaluate(`(async () => {
    for (let index = 0; index < 24; index += 1) {
      document.querySelector('[data-answer-value="3"]').click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      document.querySelector('[data-next-button]').click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    const externalResources = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => {
        try {
          const url = new URL(name);
          return url.origin !== location.origin;
        } catch {
          return false;
        }
      });
    const allowedExternalHosts = new Set([
      'www.googletagmanager.com',
      'www.google-analytics.com',
      'region1.google-analytics.com',
      'analytics.google.com',
    ]);
    const unexpectedExternalResources = externalResources.filter((name) => {
      const url = new URL(name);
      return !allowedExternalHosts.has(url.hostname);
    });

    return {
      resultVisible: !document.querySelector('[data-result-panel]').classList.contains('hidden'),
      radarPoints: document.querySelector('[data-radar-polygon]').getAttribute('points'),
      radarDescription: document.querySelector('[data-radar-description]').textContent,
      scoreCards: document.querySelectorAll('[data-score-list] > div').length,
      unexpectedExternalResources,
    };
  })()`);

  assert(resultState.resultVisible, `${label}: result panel did not become visible`);
  assert(resultState.radarPoints.length > 20, `${label}: radar chart did not render points`);
  assert(
    (resultState.radarDescription.match(/out of 100/g) ?? []).length === 6,
    `${label}: radar description does not include all six scores`,
  );
  assert(resultState.scoreCards === 6, `${label}: expected six score cards`);
  assert(
    resultState.unexpectedExternalResources.length === 0,
    `${label}: quiz loaded unexpected external resources: ${resultState.unexpectedExternalResources.join(", ")}`,
  );
  assert(client.consoleErrors.length === 0, `${label}: console errors: ${client.consoleErrors.join("; ")}`);

  const guideLoaded = client.waitFor("Page.loadEventFired");
  await client.send("Page.navigate", { url: `${appUrl}guides/what-is-a-kink-test/` });
  await guideLoaded;
  await delay(300);

  const guideState = await client.evaluate(`(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    imageCount: document.images.length,
    missingAltImages: Array.from(document.images).filter((image) => !image.hasAttribute('alt')).length,
    emptyAltImages: Array.from(document.images).filter((image) => image.alt === '').length,
    brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length,
    primaryAlt: document.images[0]?.alt,
  }))()`);

  assert(
    guideState.canonical === "https://kinktest.xyz/guides/what-is-a-kink-test/",
    `${label}: guide canonical URL mismatch`,
  );
  assert(guideState.imageCount === 1, `${label}: guide should render one primary image`);
  assert(guideState.missingAltImages === 0, `${label}: guide image is missing an alt attribute`);
  assert(guideState.emptyAltImages === 0, `${label}: guide primary image needs descriptive alt text`);
  assert(guideState.brokenImages === 0, `${label}: guide image failed to load`);
  assert(
    guideState.primaryAlt.includes("adult preferences"),
    `${label}: guide primary image alt text is not descriptive`,
  );
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
