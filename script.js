/**
 * ==========================================
 * CẤU HÌNH (CONFIG)
 * ==========================================
 */
const CONFIG = {
//   text: "Ghi gì đó đi",
  timeToFillMinutes: 15, // Mặc định, sẽ bị ghi đè bởi input
  fontSize: 120,
  fontFamily: "Arial Black, Verdana, sans-serif",
};

const canvas = document.getElementById("snowCanvas");
const ctx = canvas.getContext("2d");
const configOverlay = document.getElementById('configOverlay');
const configBox = document.getElementById('configBox');
const timeInput = document.getElementById('timeInput');
const textInput = document.getElementById('textInput'); // New
const startButton = document.getElementById('startButton');
const shareButton = document.getElementById('shareButton'); // New
const errorMsg = document.getElementById('errorMsg');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const iconMaximize = document.getElementById('icon-maximize');
const iconMinimize = document.getElementById('icon-minimize');

// --- FULLSCREEN TOGGLE ---
fullscreenBtn.addEventListener('click', toggleFullScreen);

let hideTimeout;

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function updateFullscreenButton() {
    if (document.fullscreenElement) {
        iconMaximize.style.display = 'none';
        iconMinimize.style.display = 'block';
        fullscreenBtn.setAttribute('title', 'Thoát toàn màn hình');
        
        // Start auto-hide logic
        resetHideTimer();
        document.addEventListener('mousemove', resetHideTimer);
        document.addEventListener('mousedown', resetHideTimer);
        document.addEventListener('touchstart', resetHideTimer);
    } else {
        iconMaximize.style.display = 'block';
        iconMinimize.style.display = 'none';
        fullscreenBtn.setAttribute('title', 'Toàn màn hình');
        
        // Stop auto-hide logic
        clearTimeout(hideTimeout);
        fullscreenBtn.classList.remove('hidden');
        document.removeEventListener('mousemove', resetHideTimer);
        document.removeEventListener('mousedown', resetHideTimer);
        document.removeEventListener('touchstart', resetHideTimer);
    }
}

function resetHideTimer() {
    fullscreenBtn.classList.remove('hidden');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        if (document.fullscreenElement) {
            fullscreenBtn.classList.add('hidden');
        }
    }, 3000);
}

document.addEventListener('fullscreenchange', updateFullscreenButton);

let width, height;
let textPoints = []; 
let snowFlakes = []; 
let stickyFlakes = []; 
let animationId;

// Thời gian bắt đầu sẽ được set khi bấm nút
let startTime = 0;
let totalPoints = 0;
let pointsFilled = 0;

const BACKGROUND_SNOW_COUNT = 250; 

// --- KHỞI TẠO & XỬ LÝ URL ---
const urlParams = new URLSearchParams(window.location.search);
const paramCode = urlParams.get('code'); // Đổi từ 'text' sang 'code' cho bí mật
const paramTime = urlParams.get('time');

if (paramCode && paramTime) {
    // Chế độ người xem
    const decodedText = deobfuscate(paramCode);
    if (decodedText) {
        CONFIG.text = decodedText;
    } else {
        CONFIG.text = "I LOVE\nYOU"; // Fallback
    }

    const t = parseFloat(paramTime);
    CONFIG.timeToFillMinutes = (!isNaN(t) && t > 0) ? t : 1;
    
    configOverlay.style.display = 'none';
    
    window.onload = () => {
        initGame();
    };
} else {
    // Chế độ config
    // textInput.value = CONFIG.text;
    timeInput.value = CONFIG.timeToFillMinutes;

    startButton.addEventListener('click', startGame);
    shareButton.addEventListener('click', shareLink);
    
    timeInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') startGame();
    });
}


function startGame() {
    if (!validateInputs()) return;

    CONFIG.text = textInput.value;
    CONFIG.timeToFillMinutes = parseFloat(timeInput.value);
    
    configOverlay.style.display = 'none';
    initGame();
}

function shareLink() {
    if (!validateInputs()) return;
    
    // Mã hoá văn bản thành chuỗi hex bí ẩn
    const secretCode = obfuscate(textInput.value);
    const tm = timeInput.value;
    
    // Tạo link với tham số 'code'
    const shareUrl = `${window.location.origin}${window.location.pathname}?code=${secretCode}&time=${tm}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Đã copy link bí mật! Gửi cho người ấy ngay đi nào ❤️\nLink: ...?code=" + secretCode.substring(0, 10) + "...");
    }).catch(err => {
        console.error('Không copy được: ', err);
        alert("Có lỗi khi copy link, bạn hãy thử lại nhé!");
    });
}

function validateInputs() {
    const timeVal = parseFloat(timeInput.value);
    if (isNaN(timeVal) || timeVal < 1) {
        showError("Thời gian phải từ 1 phút trở lên!");
        return false;
    }
    
    if (!textInput.value.trim()) {
         showError("Đừng để trống lời yêu thương nhé!");
         return false;
    }

    return true;
}

function showError(msg) {
    errorMsg.innerText = msg;
    errorMsg.style.display = 'block';
    configBox.classList.remove('shake');
    void configBox.offsetWidth; 
    configBox.classList.add('shake');
}

// --- MÃ HOÁ / GIẢI MÃ BÍ MẬT (XOR Cipher) ---
// Biến chữ thành chuỗi Hex ngẫu nhiên
function obfuscate(text) {
    try {
        // Tạo khóa ngẫu nhiên 1 byte (0-255)
        const key = Math.floor(Math.random() * 255);
        
        // Chuyển text sang UTF-8 encoded array để hỗ trợ tiếng Việt
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        
        // Hex của key (2 ký tự)
        let hex = key.toString(16).padStart(2, '0');
        
        // XOR đống data với key và nối vào chuỗi hex
        for (let i = 0; i < data.length; i++) {
            const xorByte = data[i] ^ key;
            hex += xorByte.toString(16).padStart(2, '0');
        }
        return hex.toUpperCase(); // Trả về chuỗi Hex viết hoa nhìn cho ngầu
    } catch (e) {
        console.error("Encode error", e);
        return "";
    }
}

// Giải mã chuỗi Hex bí ẩn về chữ
function deobfuscate(hexMap) {
    try {
        if (!hexMap || hexMap.length < 4) return null; // Ít nhất phải có Key(2) + 1 char(2)
        
        // Lấy key từ 2 ký tự đầu
        const key = parseInt(hexMap.substring(0, 2), 16);
        
        const data = [];
        for (let i = 2; i < hexMap.length; i += 2) {
            const charCode = parseInt(hexMap.substring(i, i + 2), 16);
            data.push(charCode ^ key);
        }
        
        // Chuyển array byte về lại string UTF-8
        const decoder = new TextDecoder();
        return decoder.decode(new Uint8Array(data));
    } catch (e) {
        console.error("Decode error", e);
        return null;
    }
}

// --- GAME LOGIC ---

class BaseSnowflake {
  constructor() {
    this.radius = Math.random() * 2 + 1;
    this.opacity = Math.random() * 0.5 + 0.4;

    this.swayAngle = Math.random() * Math.PI * 2;
    this.swaySpeed = Math.random() * 0.02 + 0.005;
    this.swayRange = Math.random() * 1.0 + 0.5;
  }

  updateSway() {
    this.swayAngle += this.swaySpeed;
    return Math.sin(this.swayAngle) * this.swayRange;
  }
}

class Snowflake extends BaseSnowflake {
  constructor() {
    super();
    this.init();
  }

  init() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.speed = Math.random() * 1 + 0.5;
  }

  update() {
    this.y += this.speed;
    this.x += this.updateSway();

    if (this.y > height + 5) {
      this.y = -5;
      this.x = Math.random() * width;
    }
    if (this.x > width + 5) this.x = -5;
    if (this.x < -5) this.x = width + 5;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.fill();
  }
}

class StickySnowflake extends BaseSnowflake {
  constructor(targetX, targetY) {
    super();
    this.targetX = targetX;
    this.targetY = targetY;

    const startNoise = (Math.random() - 0.5) * 50;
    this.x = targetX + startNoise;
    this.y = -Math.random() * 20;

    this.speed = Math.random() * 1.5 + 1;
    this.landed = false;

    this.driftCorrection =
      ((targetX - this.x) / (targetY - this.y)) * this.speed;
  }

  update() {
    if (this.landed) return;

    this.y += this.speed;
    this.x += this.updateSway();
    this.x += this.driftCorrection;

    if (this.y >= this.targetY) {
      this.y = this.targetY;
      this.x = this.targetX;
      this.landed = true;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.landed
      ? "rgba(255, 255, 255, 0.9)"
      : `rgba(255, 255, 255, ${this.opacity})`;
    ctx.fill();
  }
}

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  // Nếu game đã bắt đầu thì mới tính lại map, tránh lỗi khi resize lúc đang ở popup
  if (startTime > 0) {
    initTextMap();
  }
}

function initTextMap() {
  textPoints = [];
  // Giữ lại stickyFlakes cũ nếu muốn responsive mượt hơn,
  // nhưng để đơn giản ta có thể reset hoặc chỉ tính lại vị trí.
  // Ở đây ta sẽ reset nhẹ quy trình lấp đầy để tránh lỗi toạ độ cũ.
  // Tuy nhiên, để UX tốt nhất, ta chỉ tính lại toạ độ đích.
  // (Đơn giản hoá: Resize sẽ reset textPoints, nhưng stickyFlakes đã landed thì sao?
  //  Để đơn giản cho bài toán này: Resize sẽ reset tiến trình lấp đầy cho khớp màn hình mới)

  stickyFlakes = [];
  pointsFilled = 0;
  // Không reset startTime ở đây để tránh bị reset thời gian khi user xoay màn hình điện thoại
  // Nhưng cần tính lại totalPoints

  const offCanvas = document.createElement("canvas");
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext("2d");

  offCtx.fillStyle = "#FFFFFF";
  offCtx.font = `bold ${CONFIG.fontSize}px ${CONFIG.fontFamily}`;
  offCtx.textAlign = "center";
  offCtx.textBaseline = "middle";

  const lines = CONFIG.text.split("\n");
  const lineHeight = CONFIG.fontSize * 1.2;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    offCtx.fillText(line, width / 2, startY + index * lineHeight);
  });

  const imageData = offCtx.getImageData(0, 0, width, height).data;
  const gap = 3;

  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const index = (y * width + x) * 4;
      if (imageData[index + 3] > 128) {
        textPoints.push({
          x: x + (Math.random() - 0.5) * 2,
          y: y + (Math.random() - 0.5) * 2,
        });
      }
    }
  }

  textPoints.sort(() => Math.random() - 0.5);
  totalPoints = textPoints.length;
}

function initBackgroundSnow() {
  snowFlakes = [];
  for (let i = 0; i < BACKGROUND_SNOW_COUNT; i++) {
    snowFlakes.push(new Snowflake());
  }
}

function animate() {
  animationId = requestAnimationFrame(animate);
  ctx.clearRect(0, 0, width, height);

  snowFlakes.forEach((flake) => {
    flake.update();
    flake.draw();
  });

  // Chỉ chạy logic xếp chữ nếu game đã start
  if (startTime > 0) {
    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;
    const totalSeconds = CONFIG.timeToFillMinutes * 60;

    let progress = elapsedSeconds / totalSeconds;
    if (progress > 1) progress = 1;

    const targetCount = Math.floor(totalPoints * progress);

    let spawnedThisFrame = 0;
    while (
      stickyFlakes.length < targetCount &&
      pointsFilled < totalPoints &&
      spawnedThisFrame < 20
    ) {
      const target = textPoints[pointsFilled];
      stickyFlakes.push(new StickySnowflake(target.x, target.y));
      pointsFilled++;
      spawnedThisFrame++;
    }

    stickyFlakes.forEach((flake) => {
      flake.update();
      flake.draw();
    });
  }
}

// Khởi tạo ban đầu
width = canvas.width = window.innerWidth;
height = canvas.height = window.innerHeight;
window.addEventListener("resize", resize);

// Chỉ chạy tuyết nền khi chưa start
initBackgroundSnow();
animate();

function initGame() {
  startTime = Date.now();
  initTextMap();
}
