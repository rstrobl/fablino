import fs from 'fs';
import path from 'path';

const AUDIO_DIR = path.resolve('../audio');
const GW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '4b264f9073d2637852644020c487f23cad337da815654fb2';
const CHECK_INTERVAL = 3000; // 3 seconds

console.log(`Watcher started, checking ${AUDIO_DIR} every ${CHECK_INTERVAL/1000}s`);

async function check() {
  try {
    const files = fs.readdirSync(AUDIO_DIR).filter(f => f.startsWith('prompt-') && f.endsWith('.json'));
    for (const file of files) {
      const promptPath = path.join(AUDIO_DIR, file);
      const id = file.replace('prompt-', '').replace('.json', '');
      const scriptPath = path.join(AUDIO_DIR, `script-${id}.json`);
      
      if (fs.existsSync(scriptPath)) continue; // already being processed
      
      console.log(`Found prompt: ${file}, sending to OpenClaw...`);
      const prompt = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));
      
      // Send to OpenClaw gateway to generate script
      try {
        const res = await fetch('http://127.0.0.1:18789/api/sessions/main/send', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${GW_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `[FABLINO SCRIPT REQUEST] Generate a script NOW for prompt-${id}.json in /root/.openclaw/workspace/fablino/audio/. Read it, write script-${id}.json, same format as always. This is urgent — the user is waiting.`
          }),
        });
        console.log(`Gateway response: ${res.status}`);
      } catch (e) {
        console.error('Gateway send failed:', e.message);
      }
    }
  } catch (e) {
    // ignore
  }
}

setInterval(check, CHECK_INTERVAL);
check();
