// Simple CLI to print an animated ASCII iCyberNinjitsu logo in the terminal.
// Usage:
//   npm run logo
//
// Press Ctrl+C to stop the animation.

const BRAND = `
  _ ____      _               _   _ _       _ _ _             
 (_)  __ \\   | |             | \\ | (_)     (_|_) |            
  _| /  \\/ _  _| |__   ___ _ _|  \\| |_ _ __  _ _| |_ ___ _   _ 
 | | |    | | | | '_ \\ / _ \\ '__| . \` | | '_ \\| | | __/ __| | | |
 | | \\__/\\| |_| | |_) |  __/ |  | |\\  | | | | | | | |_\\__ \\ |_| |
 |_|\\____/ \\__, |_.__/ \\___|_|  \\_| \\_/_|_| |_|_| |_\\__|___/\\__,_|
            __/ |                          _/ |                    
           |___/                          |__/                     `;

const PIPELINE = 'signals ▷ trends ▷ story ▷ draft ▷ channels';
const BAR_LEN = 44;

function makeBar(pos: number): string {
  const chars = Array(BAR_LEN).fill('─');
  chars[Math.min(pos, BAR_LEN - 1)] = '●';
  return `[${chars.join('')}]`;
}

const TOTAL_FRAMES = BAR_LEN;
let i = 0;

function render() {
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(BRAND + '\n\n');
  process.stdout.write(PIPELINE + '\n');
  process.stdout.write(makeBar(i) + '\n');
  i = (i + 1) % TOTAL_FRAMES;
}

render();
const interval = setInterval(render, 80);

process.on('SIGINT', () => {
  clearInterval(interval);
  process.stdout.write('\x1b[2J\x1b[H');
  process.exit(0);
});
