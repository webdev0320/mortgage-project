const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting browser for screenshots...');
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Dashboard...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    
    // Wait for the main UI to render safely
    await page.waitForSelector('main', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot 1: Dashboard
    console.log('Capturing Dashboard screen...');
    await page.screenshot({ path: 'screenshot_01_dashboard.png', fullPage: true });

    // Upload PDF
    console.log('Triggering upload for monitoring state...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('c:\\laragon\\www\\doc-proj\\storage\\blobs\\7a95bdaa-e00c-4c22-a6bb-87b30c8d5597-Urban-1.pdf');
    
    // Wait for the Live Monitors "AI Classifying..." text to appear
    await new Promise(r => setTimeout(r, 1000));
    
    // Screenshot 2: AI Processing
    console.log('Capturing Live Monitor processing state...');
    await page.screenshot({ path: 'screenshot_02_processing.png', fullPage: true });

    // Wait until status changes to Ready for Review
    console.log('Waiting for AI completion...');
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Ready for Review');
    }, { timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));

    // Open Workspace
    console.log('Opening workspace...');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.cursor-pointer'));
      const urbanRow = rows.find(r => r.innerText.includes('Urban'));
      if (urbanRow) urbanRow.click();
    });

    await page.waitForSelector('aside');
    await new Promise(r => setTimeout(r, 3000)); // Let the canvas load
    
    // Highlight split functionality
    const images = await page.$$('img');
    if (images.length > 0) {
      await images[0].hover(); // Shows the scissors split
      await new Promise(r => setTimeout(r, 1000));
      
      // Select files for Staple (Merge)
      await page.keyboard.down('Shift');
      const containers = await page.$$('.cursor-grab');
      if (containers.length > 0) {
        await containers[0].click();
        if (containers.length > 1) {
          await containers[1].click();
        }
      }
      await page.keyboard.up('Shift');
    }
    
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 3: Workspace Tools
    console.log('Capturing Workspace tools...');
    await page.screenshot({ path: 'screenshot_03_workspace_tools.png', fullPage: true });

    console.log('All screenshots captured successfully!');
  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
})();
