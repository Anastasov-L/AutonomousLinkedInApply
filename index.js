const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1) + a);

async function clickJobEasyApply(page) {
  const btn = await page.$('button.jobs-apply-button');

  if (!btn) {
    console.log("JOB EASY APPLY NOT FOUND");
    return false;
  }

  await btn.evaluate(b => b.scrollIntoView({ block: 'center' }));
  await sleep(rand(300, 600));

  await btn.click({ delay: rand(40, 120) });

  console.log("CLICKED JOB EASY APPLY (BLUE BUTTON)");
  await sleep(2000);

  return true;
}


// Human-like typing 
async function humanType(page, text) {
  for (const char of text) {
    await page.keyboard.type(char);
    await sleep(rand(40, 180));
    if (Math.random() < 0.08) await sleep(rand(300, 900));
  }
}

async function findButton(page, text) {
  return await page.evaluateHandle((t) => {

    const norm = s => (s || "").toLowerCase().trim();

    const allButtons = [...document.querySelectorAll('button')];

    let btn = allButtons.find(b =>
      norm(b.innerText).includes(norm(t))
    );

    if (!btn) {
      btn = allButtons.find(b =>
        norm(b.getAttribute('aria-label')).includes(norm(t))
      );
    }

    if (!btn) {
      const spans = [...document.querySelectorAll('.artdeco-button__text')];
      const match = spans.find(s =>
        norm(s.innerText).includes(norm(t))
      );

      if (match) btn = match.closest('button');
    }

    return btn || null;

  }, text);
}


async function clickIfExists(page, text, label) {
  const btn = await findButton(page, text);
  if (!btn) return false;

  try {
    await btn.evaluate(b => b.scrollIntoView({ block: 'center' }));
    await sleep(rand(300, 700));
    await btn.click({ delay: rand(30, 120) });
    console.log(` Clicked: ${label}`);
    await sleep(rand(1500, 2500));
    return true;
  } catch (e) {
    console.log(` Failed to click ${label}:`, e.message);
    return false;
  }
}
async function applyToCurrentJob(page) {
  console.log(" Starting application on open job");

  const easy = await clickJobEasyApply(page);
  if (!easy) {
    console.log(" No JOB Easy Apply button on this job");
    return false;
  }

  let nextClicks = 0;
  let totalStepsWithoutProgress = 0;

  while (true) {

    // IF WE CLICKED NEXT TWICE - FORCE REVIEW
    if (nextClicks >= 2) {
      console.log(" Next clicked twice - FORCING REVIEW");

      const review =
        await clickIfExists(page, "review", "Review") ||
        await clickIfExists(page, "Review your application", "Review aria");

      if (review) {
        console.log("Review clicked - now try submit");

        await sleep(1500);

        const submitAfterReview =
          await clickIfExists(page, "submit", "Submit after review");

        if (submitAfterReview) {
          console.log("APPLICATION SUBMITTED AFTER REVIEW");

          await handleSuccessModal(page);

          return true;
        }


        nextClicks = 0;
        continue;
      }

      console.log("Review not found -> trying submit directly");

      const submitDirect =
        await clickIfExists(page, "submit", "Submit direct");

      if (submitDirect) {
        console.log(" APPLICATION SUBMITTED DIRECTLY");
        return true;
      }

      nextClicks = 0;
    }

    // NORMAL FLOW
    const submitted =
      await clickIfExists(page, "submit", "Submit application");

    if (submitted) {
      console.log("🎉 APPLICATION SUBMITTED");

      await handleSuccessModal(page);

      return true;
    }


    // TRY REVIEW
    const review =
      await clickIfExists(page, "review", "Review") ||
      await clickIfExists(page, "Review your application", "Review aria");

    if (review) {
      console.log(" Review clicked");

      await sleep(1500);

      const submitAfterReview =
        await clickIfExists(page, "submit", "Submit after review");

      if (submitAfterReview) {
        console.log(" APPLICATION SUBMITTED AFTER REVIEW");

        await handleSuccessModal(page);

        return true;
      }

      continue;
    }

    // TRY NEXT
    const next = await clickIfExists(page, "next", "Next");

    if (next) {
      nextClicks++;
      totalStepsWithoutProgress = 0;
      continue;
    }

    // NOTHING WORKED
    totalStepsWithoutProgress++;

    if (totalStepsWithoutProgress >= 3) {
      console.log(" Stuck on this job - aborting");
      return false;
    }

    await sleep(1500);
  }
}


async function openNextJob(page, index) {
  return await page.evaluate(async (i) => {
    const cards = [...document.querySelectorAll('[data-job-id]')];
    if (!cards[i]) return false;

    cards[i].scrollIntoView({ block: 'center' });
    cards[i].click();
    return true;
  }, index);
}


async function applyFiltersViaUrl(page) {
  const url = new URL(page.url());

  url.searchParams.set('f_AL', 'true');

  url.searchParams.set('f_WT', '2,3');

  url.searchParams.set('f_E', '2,3');

  const finalUrl = url.toString();
  console.log(' Navigating to filtered URL:', finalUrl);

  await page.goto(finalUrl, { waitUntil: 'domcontentloaded' });

  await Promise.race([
    page.waitForSelector('ul.jobs-search__results-list', { timeout: 25000 }),
    page.waitForSelector('[data-job-id]', { timeout: 25000 }),
    page.waitForSelector('.jobs-search-results-list', { timeout: 25000 }),
    sleep(8000)
  ]);
}
async function handleSuccessModal(page) {

  console.log(" Waiting for success modal...");

  await page.waitForSelector('[data-test-modal-id="post-apply-modal"], .artdeco-modal', {
    timeout: 10000
  });

  await sleep(2000);

  let clicked = false;

  for (let attempt = 1; attempt <= 3; attempt++) {

    console.log(`Done click attempt ${attempt}`);

    clicked = await page.evaluate(() => {

      const norm = s => (s || "").toLowerCase();

      const buttons = [...document.querySelectorAll('button')];

      let btn = buttons.find(b =>
        norm(b.innerText).includes("done")
      );

      if (!btn) {
        btn = buttons.find(b =>
          norm(b.getAttribute("aria-label")).includes("done")
        );
      }

      if (!btn) {
        const span = [...document.querySelectorAll('.artdeco-button__text')]
          .find(s => norm(s.innerText).includes("done"));

        if (span) btn = span.closest("button");
      }

      if (!btn) return false;

      btn.scrollIntoView({ block: 'center' });

      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      return true;

    });

    if (clicked) {
      console.log(" CLICKED DONE (fresh DOM)");
      break;
    }

    await sleep(1500);
  }

  if (!clicked) {
    await page.evaluate(() => {
      const x = document.querySelector('[aria-label="Dismiss"]');
      x?.click();
    });
  }

  await page.waitForFunction(() => {
    return !document.querySelector('[data-test-modal-id="post-apply-modal"]');
  }, { timeout: 12000 });

  console.log("Success modal fully closed");

  const wait = rand(4000, 10000);
  console.log(`Post-apply cooldown ${wait}ms`);
  await sleep(wait);
}

async function safeScrollAndClick(handle, label) {
  try {
    await handle.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await sleep(rand(250, 700));
    await handle.click({ delay: rand(20, 120) });
    console.log(`Clicked: ${label}`);
    return true;
  } catch (e) {
    console.log(`Failed click: ${label} — ${e.message}`);
    return false;
  }
}

async function getFirstJobId(page) {
  try {
    return await page.evaluate(() => {
      const el = document.querySelector('[data-job-id]');
      return el ? el.getAttribute('data-job-id') : null;
    });
  } catch {
    return null;
  }
}

async function waitForResultsRefresh(page, beforeJobId, label) {
  const beforeUrl = page.url();
  const start = Date.now();

  console.log(` Waiting for results refresh (${label})…`);
  console.log(`   beforeJobId=${beforeJobId} beforeUrl=${beforeUrl}`);

  try {
    await Promise.race([
      page.waitForFunction(
        (oldUrl, oldId) => {
          const newUrl = location.href;
          const el = document.querySelector('[data-job-id]');
          const newId = el ? el.getAttribute('data-job-id') : null;

          if (newUrl !== oldUrl) return true;
          if (oldId && newId && newId !== oldId) return true;

          return !!document.querySelector('ul.jobs-search__results-list');
        },
        { timeout: 30000 },
        beforeUrl,
        beforeJobId
      ),
      sleep(12000)
    ]);
  } catch {
    // ignore
  }

  const afterJobId = await getFirstJobId(page);
  const afterUrl = page.url();

  console.log(` Done waiting (${label}). took=${Date.now() - start}ms`);
  console.log(`   afterJobId=${afterJobId} afterUrl=${afterUrl}`);
}

async function findFiltersFrame(page) {
  const frames = page.frames();

  for (const frame of frames) {
    try {
      const hit = await frame.evaluate(() => {
        const hasEasy =
          !!document.querySelector('#searchFilter_applyWithLinkedin') ||
          Array.from(document.querySelectorAll('button')).some(b =>
            (b.getAttribute('aria-label') || '').toLowerCase().includes('easy apply')
          );

        const hasFiltersSection =
          !!document.querySelector('section[aria-label="search filters"]') ||
          !!document.querySelector('section[aria-label*="filters" i]');

        return hasEasy || hasFiltersSection;
      });

      if (hit) {
        console.log(' Filters frame selected:', frame.url());
        return frame;
      }
    } catch {
    }
  }

  console.log(' Could not find filters frame in page.frames()');
  return null;
}

async function ensureFiltersFrame(page, current) {
  if (current && !current.isDetached()) return current;
  return await findFiltersFrame(page);
}

async function applyEasyApply(page, frame) {
  const btn =
    (await frame.$('#searchFilter_applyWithLinkedin')) ||
    (await frame.$('button[aria-label*="Easy Apply" i]'));

  if (!btn) {
    console.log('Easy Apply button not found in filters frame');
    return false;
  }

  const before = await frame.evaluate(el => el.getAttribute('aria-checked'), btn);
  console.log(' Easy Apply aria-checked BEFORE:', before);

  if (before === 'true') {
    console.log('Easy Apply already ON');
    return true;
  }

  const beforeId = await getFirstJobId(page);
  await safeScrollAndClick(btn, 'Easy Apply');
  await sleep(rand(3800, 6800));

  // LinkedIn can re-render; re-query and verify
  const btn2 =
    (await frame.$('#searchFilter_applyWithLinkedin')) ||
    (await frame.$('button[aria-label*="Easy Apply" i]'));

  if (!btn2) {
    console.log('Easy Apply disappeared after click (rerender). Treating as not confirmed.');
    return false;
  }

  const after = await frame.evaluate(el => el.getAttribute('aria-checked'), btn2);
  console.log('Easy Apply aria-checked AFTER:', after);

  const ok = after === 'true';
  console.log(ok ? 'Easy Apply APPLIED' : ' Easy Apply did NOT toggle');

  await sleep(rand(700, 1400));
  await waitForResultsRefresh(page, beforeId, 'easy apply');

  return ok;
}

// MAIN
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    userDataDir: 'C:\\linkedin-puppeteer-profile',
    args: ['--start-maximized'],
    defaultViewport: null
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  // Open LinkedIn feed
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
  await sleep(rand(5000, 10000));

  // Click Jobs
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const jobs = links.find(a =>
      (a.innerText || '').trim().toLowerCase() === 'jobs' ||
      (a.getAttribute('aria-label') || '').toLowerCase().startsWith('jobs') ||
      (a.getAttribute('href') || '').includes('/jobs')
    );
    jobs?.click();
  });

  console.log('Jobs clicked');
  await sleep(rand(10000, 20000));

  // Title input
  const titleFocused = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const title = inputs.find(i =>
      (i.getAttribute('aria-label') || '').toLowerCase().includes('title') ||
      (i.getAttribute('data-testid') || '').includes('keyword') ||
      (i.placeholder || '').toLowerCase().includes('title')
    );
    if (title) {
      title.focus();
      return true;
    }
    return false;
  });
  if (!titleFocused) return console.log(' Title input not found');

  await sleep(rand(800, 1500));
  await humanType(page, 'Frontend Developer');
  console.log(' Title typed');

  await sleep(rand(2000, 4000));

  const locationFocused = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const location = inputs.find(i =>
      (i.getAttribute('aria-label') || '').toLowerCase().includes('location') ||
      (i.getAttribute('data-testid') || '').includes('location') ||
      (i.placeholder || '').toLowerCase().includes('city')
    );
    if (location) {
      location.focus();
      return true;
    }
    return false;
  });
  if (!locationFocused) return console.log(' Location input not found');

  await sleep(rand(800, 1500));
  await humanType(page, 'Netherlands');
  console.log(' Location typed');

  await sleep(rand(1500, 3000));

  await page.keyboard.press('Enter');
  console.log(' Search submitted');

  await Promise.race([
    page.waitForSelector('ul.jobs-search__results-list', { timeout: 20000 }),
    page.waitForSelector('[data-job-id]', { timeout: 20000 }),
    sleep(8000)
  ]);

  await sleep(rand(6000, 12000));
  console.log('Job results loaded');

  let filtersFrame = await findFiltersFrame(page);
  if (!filtersFrame) return console.log('No filters frame found — cannot apply filters.');

  filtersFrame = await ensureFiltersFrame(page, filtersFrame);
  const easyApplied = await applyEasyApply(page, filtersFrame);
  console.log('RESULT: easyApplied =', easyApplied);

  await applyFiltersViaUrl(page);
  console.log('Filters applied via URL');


  let jobIndex = 0;

  while (true) {
    console.log(`\n Processing job #${jobIndex + 1}`);

    if (jobIndex > 0) {
      const opened = await openNextJob(page, jobIndex);
      if (!opened) break;

      await Promise.race([
        page.waitForSelector('button.jobs-apply-button', { timeout: 8000 }),
        sleep(4000)
      ]);
    }


    // Apply
    const result = await applyToCurrentJob(page);

    if (!result) {
      console.log("Skipped this job");
    }

    jobIndex++;
    await sleep(rand(2000, 4000));
  }


  console.log('Finished Applying');
})();
