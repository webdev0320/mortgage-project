const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  try {
    console.log('Hitting API directly to find a COMPLETED blob...');
    // We can just go to the dashboard, wait 2 sec, and click ANY row.
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('main', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Opening workspace...');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.cursor-pointer'));
      const anyRow = rows.find(r => r.innerText.includes('Urban') || r.innerText.includes('Ready'));
      if (anyRow) anyRow.click();
    });

    await page.waitForSelector('aside', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Highlighting tools...');
    const images = await page.$$('img');
    if (images.length > 0) {
      await images[0].hover(); // Hover first thumbnail
      await new Promise(r => setTimeout(r, 1000));
      
      await page.keyboard.down('Shift');
      const containers = await page.$$('.cursor-grab');
      if (containers.length > 0) {
        await containers[0].click();
        if (containers.length > 1) await containers[1].click();
      }
      await page.keyboard.up('Shift');
    }
    
    await new Promise(r => setTimeout(r, 1500));
    console.log('Capturing Workspace tools...');
    await page.screenshot({ path: 'screenshot_03_workspace_tools.png', fullPage: true });

  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
})();
