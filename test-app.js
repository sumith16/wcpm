const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        console.log('Going to http://localhost:8080');
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
        
        console.log('Taking screenshot 1...');
        await page.screenshot({ path: 'screenshot1.png' });
        
        console.log('Refreshing page...');
        await page.reload({ waitUntil: 'networkidle0' });
        
        console.log('Taking screenshot 2...');
        await page.screenshot({ path: 'screenshot2.png' });
        
        const content = await page.content();
        if (content.includes('animate-spin')) {
            console.log('App appears to STILL BE STUCK on loading spinner.');
        } else {
            console.log('App loaded fine, NO loading spinner found.');
        }
        
        await browser.close();
    } catch (e) {
        console.error('Puppeteer error:', e);
    }
})();
