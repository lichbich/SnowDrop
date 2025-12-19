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
  twinkle: true, // Hiệu ứng lấp lánh
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
const twinkleToggle = document.getElementById('twinkleToggle'); // Toggle mới
const mainShareBtn = document.getElementById('mainShareBtn'); // Nút share trong game

// --- FULLSCREEN TOGGLE ---
fullscreenBtn.addEventListener('click', toggleFullScreen);
mainShareBtn.addEventListener('click', shareActiveGame);

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
    } else {
        iconMaximize.style.display = 'block';
        iconMinimize.style.display = 'none';
        fullscreenBtn.setAttribute('title', 'Toàn màn hình');
    }
}

function resetHideTimer() {
    fullscreenBtn.classList.remove('hidden');
    mainShareBtn.classList.remove('hidden');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        fullscreenBtn.classList.add('hidden');
        mainShareBtn.classList.add('hidden');
    }, 3000);
}

document.addEventListener('fullscreenchange', updateFullscreenButton);

// Start auto-hide logic globally
resetHideTimer();
document.addEventListener('mousemove', resetHideTimer);
document.addEventListener('mousedown', resetHideTimer);
document.addEventListener('touchstart', resetHideTimer);

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
    CONFIG.twinkle = twinkleToggle.checked; // Lấy giá trị toggle
    
    configOverlay.style.display = 'none';
    initGame();
}

function shareActiveGame() {
    // Share khi game đang chạy (lấy config hiện tại)
    const secretCode = obfuscate(CONFIG.text);
    const tm = CONFIG.timeToFillMinutes;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?code=${secretCode}&time=${tm}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Đã copy link! Gửi cho người ấy ngay đi nào ❤️");
    }).catch(err => {
        console.error('Không copy được: ', err);
        alert("Có lỗi khi copy link.");
    });
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

// --- MOUSE INTERACTION ---
const mouse = { x: -9999, y: -9999, radius: 100 };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseout', () => {
    mouse.x = -9999;
    mouse.y = -9999;
});
window.addEventListener('touchstart', (e) => {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
});
window.addEventListener('touchend', () => {
    mouse.x = -9999;
    mouse.y = -9999;
});

class BaseSnowflake {
  constructor() {
    this.radius = Math.random() * 2 + 1;
    this.baseOpacity = Math.random() * 0.5 + 0.4;
    this.opacity = this.baseOpacity;
    
    // Physics properties
    this.vx = 0;
    this.vy = 0;
    this.friction = 0.95; // Giảm tốc độ dần

    this.swayAngle = Math.random() * Math.PI * 2;
    this.swaySpeed = Math.random() * 0.02 + 0.005;
    this.swayRange = Math.random() * 1.0 + 0.5;

    // Twinkle properties
    // Chỉ 20% hạt có khả năng lấp lánh nếu mode bật
    this.canTwinkle = Math.random() < 0.5; 
    this.twinkleSpeed = Math.random() * 0.1 + 0.05;
    this.twinklePhase = Math.random() * Math.PI * 4;
  }

  updateSway() {
    this.swayAngle += this.swaySpeed;
    return Math.sin(this.swayAngle) * this.swayRange;
  }

  updateTwinkle() {
    if (CONFIG.twinkle && this.canTwinkle) {
        this.twinklePhase += this.twinkleSpeed;
        // Opacity dao động từ baseOpacity * 0.3 đến baseOpacity * 1.5 (có thể sáng hơn mức bình thường 1 chút)
        // Dùng sin để tạo nhịp điệu
        const val = Math.sin(this.twinklePhase); // -1 -> 1
        // Map val (-1, 1) -> (0.3, 1.3) factor
        const factor = 0.8 + val * 0.5; 
        this.opacity = Math.min(1, Math.max(0.1, this.baseOpacity * factor));
    } else {
        this.opacity = this.baseOpacity;
    }
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
    this.vx = 0;
    this.vy = 0;
  }

  update() {
    // Basic movement
    this.y += this.speed;
    this.x += this.updateSway();
    
    // Mouse Interaction
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < mouse.radius) {
        // Calculate repulsion force
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (mouse.radius - distance) / mouse.radius;
        const power = 3; // Strength of repulsion
        
        this.vx += forceDirectionX * force * power;
        this.vy += forceDirectionY * force * power;
    }

    // Apply physics
    this.x += this.vx;
    this.y += this.vy;
    
    // Friction
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Twinkle
    this.updateTwinkle();

    // Reset if out of bounds (standard loop)
    if (this.y > height + 5) {
      this.y = -5;
      this.x = Math.random() * width;
      this.vx = 0;
      this.vy = 0;
    }
    if (this.x > width + 5) this.x = -5;
    if (this.x < -5) this.x = width + 5;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    
    // Flare effect
    if (CONFIG.twinkle && this.canTwinkle && this.opacity > 0.6) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "white";
    } else {
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
  }
}

class StickySnowflake extends BaseSnowflake {
  constructor(targetX, targetY) {
    super();
    this.targetX = targetX;
    this.targetY = targetY;

    // Chỉnh radius theo font size để chữ nhỏ thì tuyết nhỏ, nhìn rõ nét hơn
    const baseRadius = CONFIG.usedFontSize ? CONFIG.usedFontSize / 40 : 2; 
    this.radius = Math.random() * baseRadius + (baseRadius * 0.5);

    const startNoise = (Math.random() - 0.5) * 50;
    this.x = targetX + startNoise;
    this.y = -Math.random() * 20;

    this.speed = Math.random() * 1.5 + 1;
    this.landed = false;
  }

  update() {
    // 1. Mouse Interaction (Check ngay cả khi đã landed)
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < mouse.radius) {
        // Nếu chuột chạm vào -> Bị văng ra
        this.landed = false;
        
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (mouse.radius - distance) / mouse.radius;
        const power = 3; // Lực văng mạnh hơn background một chút
        
        this.vx += forceDirectionX * force * power;
        this.vy += forceDirectionY * force * power;
    }

    if (this.landed) {
        // Update twinkle even if landed
        this.updateTwinkle();
        return;
    }

    // 2. Movement Logic
    // Apply sway
    this.x += this.updateSway();
    // Apply physics velocity (do chuột tác động)
    this.x += this.vx;
    this.y += this.vy;
    
    // Apply friction to physics velocity
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 3. Falling / Return Logic
    // Tính vector hướng về đích
    const targetDx = this.targetX - this.x;
    const targetDy = this.targetY - this.y;
    
    // Nếu chưa chạm đáy (đang rơi tự do ban đầu) hoặc đang bị văng
    // Ta thêm logic: Luôn bị hút về đích
    
    // Tốc độ hồi phục về vị trí cũ
    const returnSpeed = 0.05; // Hệ số lerp
    
    // Nếu đang rơi xuống lần đầu (chưa bao giờ landed và y còn xa)
    if (this.y < this.targetY && Math.abs(this.vy) < 0.1 && Math.abs(this.vx) < 0.1 && !this.landed) {
         this.y += this.speed;
         
         // Drift correction cũ để hướng về đích khi đang rơi
         const drift = ((this.targetX - this.x) / (this.targetY - this.y)) * this.speed;
         // Giới hạn drift kẻo bị văng quá xa nếu chia cho số nhỏ
         if (!isNaN(drift) && Math.abs(drift) < 5) {
             this.x += drift;
         }
    } else {
        // Đã qua y đích hoặc đang bay lung tung do chuột
        // Bay từ từ về đích
        this.x += targetDx * returnSpeed;
        this.y += targetDy * returnSpeed;
    }

    // 4. Check Landing
    // Nếu gần đích và vận tốc thấp -> Snap
    const distToTarget = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
    if (distToTarget < 2 && Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.landed = true;
        this.vx = 0;
        this.vy = 0;
    }
    
    this.updateTwinkle();
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    // Logic landed cũ là 0.9, giờ ta thay bằng biến opacity đã có hiệu ứng twinkle
    // Nếu landed mà ko twinkle thì nó sẽ là baseOpacity (random 0.4-0.9)
    // Nhưng thiết kế cũ landed cứng 0.9.
    // Vậy ta chỉnh baseOpacity của StickySnowflake cao hơn chút?
    // Hoặc đơn giản: Nếu landed thì base = 0.9.
    
    let drawOpacity = this.opacity;
    let isFlare = false;
    
    if (this.landed) {
        // Nếu landed, ta muốn nó sáng (0.9), nhưng vẫn twinkle nếu cần
        if (CONFIG.twinkle && this.canTwinkle) {
            // Recalculate based on 0.9 base
             const val = Math.sin(this.twinklePhase); 
             const factor = 1.0 + val * 0.3; // 0.7 -> 1.3
             drawOpacity = Math.min(1, 0.9 * factor);
             if (drawOpacity > 0.95) isFlare = true;
        } else {
            drawOpacity = 0.9;
        }
    } else {
        if (CONFIG.twinkle && this.canTwinkle && this.opacity > 0.6) isFlare = true;
    }
    
    if (isFlare) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "white";
    } else {
        ctx.shadowBlur = 0;
    }
    
    ctx.fillStyle = `rgba(255, 255, 255, ${drawOpacity})`;
    ctx.fill();
    ctx.shadowBlur = 0;
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

  // --- Responsive Text Logic ---
  let fontSize = CONFIG.fontSize;
  let lines = [];
  const maxWidth = width * 0.9;
  
  function getLines(ctx, text, maxWidth) {
      const words = text.split(" ");
      const lines = [];
      let currentLine = words[0];
      for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const measure = ctx.measureText(currentLine + " " + word);
          if (measure.width < maxWidth) {
              currentLine += " " + word;
          } else {
              lines.push(currentLine);
              currentLine = word;
          }
      }
      lines.push(currentLine);
      return lines; 
  }

  function calculateLayout(currentFontSize) {
      offCtx.font = `bold ${currentFontSize}px ${CONFIG.fontFamily}`;
      const userLines = CONFIG.text.split("\n");
      let finalLines = [];
      
      for (let line of userLines) {
          const words = line.split(" ");
          let currentLine = words[0];
          
          for (let i = 1; i < words.length; i++) {
              const word = words[i];
              if (offCtx.measureText(currentLine + " " + word).width < maxWidth) {
                  currentLine += " " + word;
              } else {
                  finalLines.push(currentLine);
                  currentLine = word;
              }
          }
          finalLines.push(currentLine);
      }
      return finalLines;
  }

  let minFontSize = 30; // Tăng minFontSize lên để dễ đọc hơn
  
  while (fontSize > minFontSize) {
      offCtx.font = `bold ${fontSize}px ${CONFIG.fontFamily}`;
      const calculatedLines = calculateLayout(fontSize);
      
      // Vẫn kiểm tra chiều ngang của từng từ (phòng trường hợp 1 từ siêu dài)
      let wordTooLong = false;
      const allWords = CONFIG.text.split(/\s+/);
      for (let w of allWords) {
             if (offCtx.measureText(w).width > maxWidth) {
                 wordTooLong = true;
                 break;
             }
      }
      if (wordTooLong) {
          fontSize -= 5;
          continue;
      }

      // Check height: Nếu cao quá 80% màn thì giảm font
      const totalHeight = calculatedLines.length * (fontSize * 1.2);
      if (totalHeight > height * 0.8) {
          fontSize -= 5;
          continue;
      }
      
      lines = calculatedLines;
      break;
  }
  
  if (lines.length === 0) lines = calculateLayout(fontSize);

  // LƯU LẠI FONT SIZE ĐỂ DÙNG CHO LOGIC VẼ TUYẾT
  CONFIG.usedFontSize = fontSize;

  const lineHeight = fontSize * 1.2;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  offCtx.fillStyle = "#FFFFFF";
  offCtx.textAlign = "center";
  offCtx.textBaseline = "middle";
  offCtx.font = `bold ${fontSize}px ${CONFIG.fontFamily}`;
  
  lines.forEach((line, index) => {
    offCtx.fillText(line, width / 2, startY + index * lineHeight);
  });

  const imageData = offCtx.getImageData(0, 0, width, height).data;
  
  // GAP DYNAMIC THEO FONT SIZE
  // Font to -> Gap to (ít điểm hơn). Font nhỏ -> Gap nhỏ (nhiều điểm hơn để rõ nét)
  // Ví dụ: Font 120 -> Gap 4. Font 40 -> Gap 2.
  const gap = Math.max(2, Math.floor(fontSize / 30)); 

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
