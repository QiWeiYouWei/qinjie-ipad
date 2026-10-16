const {chromium}=require('C:/Users/22078/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('qinjie-state')));
  // Expected pitches are inferred from the visible notation, rather than a hidden app test hook.
  async function question(){return await page.locator('.reading-question svg').evaluate(svg=>{const numbered=svg.classList.contains('jianpu-score');if(numbered){const degree=Number(svg.querySelector('text[font-weight="600"]').textContent),dot=svg.querySelector('.octave-dot'),octave=dot?(Number(dot.getAttribute('cy'))<94?1:-1):0,sharp=svg.querySelector('.accidental')?.textContent==='♯'?1:0;return 60+[0,2,4,5,7,9,11][degree-1]+octave*12+sharp}const head=svg.querySelector('ellipse'),y=Number(head.getAttribute('cy')),step=Math.round((132-y)/6),octave=Math.floor(step/7),letter=((step%7)+7)%7,sharp=svg.querySelector('.accidental')?.textContent==='♯'?1:0;return 60+octave*12+[0,2,4,5,7,9,11][letter]+sharp})}
  async function answerCorrect(){const n=await question();await page.locator(`[data-reading-answer="${n}"]`).tap();return n}
  try{
    await page.goto('http://127.0.0.1:5173');await page.locator('[data-nav="reading"]').click();
    await page.locator('[data-reading-mode="bridge"]').click();assert.equal(await page.locator('.reading-choice').count(),4);assert.equal(await page.locator('.reading-choice svg').count(),4);
    const correct=await question(),wrong=await page.locator(`[data-reading-answer]:not([data-reading-answer="${correct}"])`).first().getAttribute('data-reading-answer');await page.locator(`[data-reading-answer="${wrong}"]`).tap();
    assert.match(await page.locator('.reading-feedback').innerText(),/这次没选对/);assert.equal(await page.locator('.reading-pair svg').count(),2);assert.equal(await page.locator('[data-reading-answer]:enabled').count(),0);await page.locator('#reading-next').click();
    for(let i=1;i<10;i++){await answerCorrect();await page.locator('#reading-next').click()}
    assert.match(await page.locator('.reading-result').innerText(),/首次答对 9\/10/);let s=await state();assert.equal(s.reading.history.length,1);assert.equal(s.reading.history[0].correct,9);assert.equal(s.history.length,0);
    const target=s.reading.notes.find(n=>n.note===correct);assert.equal(target.attempts>=1,true);
    // One pitch appears only once per review round; repeat across rounds to reach 3 correct answers.
    while((await page.locator('#reading-review').count())>0){await page.locator('#reading-review').click();assert.match(await page.locator('.badge').innerText(),/1\/1题/);await answerCorrect();await page.locator('#reading-next').click()}
    assert.match(await page.locator('main').innerText(),/待巩固 0 个音/);
    await page.locator('#reading-again').click();assert.match(await page.locator('.badge').innerText(),/看五线谱找音/);await page.locator('#reading-stop').click();
    await page.locator('[data-reading-mode="staff"]').click();await answerCorrect();await page.locator('#reading-next').click();await page.evaluate(()=>window.pausePiano());
    s=await state();assert.equal(s.reading.history.at(-1).total,1);assert.equal(s.reading.history.at(-1).complete,false);assert.equal(await page.locator('.reading-round').count(),0);
    await page.locator('[data-reading-mode="numbered"]').click();await answerCorrect();await page.locator('[data-nav="home"]').click();assert.equal((await state()).reading.history.at(-1).mode,'numbered');
    await page.reload();await page.locator('[data-nav="progress"]').click();assert.match(await page.locator('main').innerText(),/识谱训练进度/);await page.locator('[data-action="reading"]').click();
    await page.locator('#reading-level').selectOption('3');await page.locator('[data-reading-mode="staff"]').click();
    for(const size of [{width:1280,height:800},{width:800,height:1280},{width:600,height:960}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
    await page.locator('#reading-stop').click();await page.locator('[data-nav="settings"]').click();const event=page.waitForEvent('download');await page.locator('#export').click();const backup=await event;await backup.saveAs('.build/backup15-training.json');const saved=JSON.parse(fs.readFileSync('.build/backup15-training.json','utf8'));assert.ok(saved.reading.history.length>=3);
    page.once('dialog',d=>d.accept());await page.evaluate(raw=>window.importPianoState(raw),JSON.stringify(saved));assert.deepEqual((await state()).reading,saved.reading);
    await page.locator('[data-nav="reading"]').click();await page.locator('#reading-level').selectOption('0');await page.locator('[data-reading-mode="bridge"]').click();
    fs.mkdirSync('release/previews',{recursive:true});await page.setViewportSize({width:1280,height:800});await page.screenshot({path:'release/previews/reading-training-1.5.png',fullPage:true});
    assert.deepEqual(errors,[]);console.log('PASS: visible notation matching, answer locking, 9/10 scoring, weak-note review across rounds, partial/background save, reload, growth summary, 3 layouts and full backup restore.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
