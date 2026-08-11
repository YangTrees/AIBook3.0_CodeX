const endpoint = process.env.AIBOOK_DEBUG_ENDPOINT || 'http://127.0.0.1:9223/json';
const pages = await (await fetch(endpoint)).json();
const page = pages.find((item) => item.type === 'page' && item.url.startsWith('aibook://app/'));
if (!page) throw new Error('没有找到正在运行的客户端页面。');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let commandId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  const resolver = pending.get(message.id);
  if (!resolver) return;
  pending.delete(message.id);
  if (message.error) resolver.reject(new Error(message.error.message));
  else resolver.resolve(message.result?.result?.value);
};

const evaluate = (expression, awaitPromise = false) => new Promise((resolve, reject) => {
  commandId += 1;
  pending.set(commandId, { resolve, reject });
  socket.send(JSON.stringify({
    id: commandId,
    method: 'Runtime.evaluate',
    params: { expression, awaitPromise, returnByValue: true },
  }));
});

const initial = JSON.parse(await evaluate(`JSON.stringify({
  title: document.title,
  text: document.body.innerText,
  hasBridge: Boolean(window.aibookClient)
})`));
if (!initial.hasBridge) throw new Error('客户端安全桥没有注入。');
if (!initial.text.includes('激活课程客户端') && !initial.text.includes('欢迎回来')) {
  throw new Error('客户端没有显示激活或登录页面。');
}

if (initial.text.includes('激活课程客户端')) {
  await evaluate(`(async () => {
    const input = document.querySelector('#activation-code');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'AIBOOK-DEMO-2026');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 100));
    document.querySelector('form').requestSubmit();
    await new Promise(resolve => setTimeout(resolve, 1200));
  })()`, true);
}

const loginText = await evaluate('document.body.innerText');
if (!loginText.includes('欢迎回来')) throw new Error(`开发授权激活失败：${loginText.slice(-300)}`);

await evaluate(`(async () => {
  const button = [...document.querySelectorAll('button')].find(item => item.textContent.includes('进入课程'));
  button.click();
  await new Promise(resolve => setTimeout(resolve, 600));
})()`, true);

const courseState = JSON.parse(await evaluate(`(async () => {
  const game = await fetch('./assets/games/games/index01.html');
  const video = await fetch('./assets/videos/videos/01/story.mp4', { headers: { Range: 'bytes=0-1023' } });
  const videoBytes = await video.arrayBuffer();
  return JSON.stringify({
    homeVisible: document.body.innerText.includes('32节完整课程'),
    gameStatus: game.status,
    gameType: game.headers.get('content-type'),
    gameProtection: game.headers.get('x-aibook-protected'),
    videoStatus: video.status,
    videoBytes: videoBytes.byteLength,
    videoProtection: video.headers.get('x-aibook-protected')
  });
})()`, true));

if (!courseState.homeVisible) throw new Error('登录后没有进入课程首页。');
if (courseState.gameStatus !== 200) throw new Error(`游戏资源加载失败：HTTP ${courseState.gameStatus}`);
if (courseState.gameProtection !== 'aes-256-gcm' || courseState.videoProtection !== 'aes-256-gcm') {
  throw new Error('游戏或视频没有经过加密资源层读取。');
}
if (![200, 206].includes(courseState.videoStatus) || courseState.videoBytes !== 1024) {
  throw new Error(`视频范围读取失败：HTTP ${courseState.videoStatus}，${courseState.videoBytes}字节`);
}

console.log(JSON.stringify({
  title: initial.title,
  activation: '通过',
  login: '通过',
  home: '通过',
  gameResource: `${courseState.gameStatus} ${courseState.gameType || ''}`.trim(),
  videoRange: `${courseState.videoStatus} ${courseState.videoBytes} bytes`,
  protection: courseState.videoProtection,
}, null, 2));
socket.close();
