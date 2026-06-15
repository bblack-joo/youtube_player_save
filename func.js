let playlist = [];
let currentIndex = 0;
let player = null;
let autoNextEnabled = true;
let extractedLinks = [];
let stopScanRequested = false;

const PLAYLIST_KEY = "yuchan_playlists";

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);

function getYouTubeId(url) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "").split("?")[0];
    }

    if (u.searchParams.get("v")) {
      return u.searchParams.get("v");
    }

    if (u.pathname.includes("/embed/")) {
      return u.pathname.split("/embed/")[1].split("/")[0];
    }

    if (u.pathname.includes("/shorts/")) {
      return u.pathname.split("/shorts/")[1].split("/")[0];
    }

    return null;
  } catch {
    return null;
  }
}

function splitLinks(text) {
  return text
    .split(/[\s,]+/)
    .map(v => v.trim())
    .filter(v => v);
}

function startPlaylist() {
  const lines = splitLinks(document.getElementById("linksInput").value);

  if (lines.length === 0) {
    alert("링크를 입력하세요.");
    return;
  }

  playlist = lines
    .map((link, index) => ({
      title: `영상 ${index + 1}`,
      link,
      videoId: getYouTubeId(link)
    }))
    .filter(v => v.videoId);

  if (playlist.length === 0) {
    alert("유효한 유튜브 링크가 없습니다.");
    return;
  }

  document.getElementById("setup").style.display = "none";
  document.getElementById("playerPage").style.display = "block";

  currentIndex = 0;
  player = null;

  createOrLoadPlayer();
  updateInfo();
}

function createOrLoadPlayer() {
  const item = playlist[currentIndex];

  if (!player) {
    player = new YT.Player("youtubePlayer", {
      videoId: item.videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1
      },
      events: {
        onReady: event => event.target.playVideo(),
        onStateChange: onPlayerStateChange
      }
    });
  } else {
    player.loadVideoById(item.videoId);
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED && autoNextEnabled) {
    nextVideo();
  }
}

function updateInfo() {
  const item = playlist[currentIndex];

  document.getElementById("counter").textContent =
    `${currentIndex + 1} / ${playlist.length}`;

  document.getElementById("title").textContent = item.title;

  const percent = Math.round(((currentIndex + 1) / playlist.length) * 100);

  document.getElementById("progressBar").style.width = percent + "%";
  document.getElementById("progressText").textContent = `${percent}% 완료`;

  document.getElementById("prevBtn").disabled = currentIndex === 0;

  document.getElementById("openBtn").onclick = () => {
    window.open(item.link, "_blank");
  };
}

function nextVideo() {
  if (currentIndex >= playlist.length - 1) {
    showFinish();
    return;
  }

  currentIndex++;
  updateInfo();
  createOrLoadPlayer();
}

function prevVideo() {
  if (currentIndex <= 0) return;

  currentIndex--;
  updateInfo();
  createOrLoadPlayer();
}

function showFinish() {
  if (player && player.stopVideo) {
    player.stopVideo();
  }

  document.getElementById("playerPage").innerHTML = `
    <div class="finish">
      🎉 오늘 영상 끝!
      <br><br>
      <button id="restartBtn">처음부터 보기</button>
      <button id="homeBtn">홈으로</button>
    </div>
  `;

  document.getElementById("restartBtn").addEventListener("click", restartPlaylist);
  document.getElementById("homeBtn").addEventListener("click", goHome);
}

function restartPlaylist() {
  currentIndex = 0;
  player = null;

  document.getElementById("playerPage").innerHTML = `
    <div class="topbar">
      <div>
        <div id="counter" class="counter"></div>
        <div id="title" class="title"></div>
      </div>

      <div class="top-buttons">
        <button id="homeBtn">🏠 홈</button>
        <button id="autoBtn">자동 다음: ${autoNextEnabled ? "ON" : "OFF"}</button>
        <button id="fullscreenBtn">전체 화면 ⛶</button>
      </div>
    </div>

    <div id="videoFrame" class="video-frame">
      <div id="youtubePlayer"></div>
    </div>

    <div class="progress-wrap">
      <div id="progressBar" class="progress-bar"></div>
    </div>

    <div id="progressText" class="progress-text"></div>

    <div class="buttons">
      <button id="prevBtn">◀ 이전</button>
      <button id="openBtn">유튜브에서 열기 ▶</button>
      <button id="nextBtn">다음 ▶</button>
    </div>

    <div class="shortcut">
      ␣ 재생/정지 · ← 이전 · → 다음 · F 전체화면 · A 자동다음
    </div>
  `;

  bindButtons();
  createOrLoadPlayer();
  updateInfo();
}

function goHome() {
  if (player && player.stopVideo) {
    player.stopVideo();
  }

  playlist = [];
  currentIndex = 0;
  player = null;

  document.getElementById("playerPage").style.display = "none";
  document.getElementById("setup").style.display = "block";
}

function bindButtons() {
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const autoBtn = document.getElementById("autoBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const homeBtn = document.getElementById("homeBtn");

  if (nextBtn) nextBtn.onclick = nextVideo;
  if (prevBtn) prevBtn.onclick = prevVideo;
  if (homeBtn) homeBtn.onclick = goHome;

  if (autoBtn) {
    autoBtn.textContent = autoNextEnabled ? "자동 다음: ON" : "자동 다음: OFF";
    autoBtn.style.background = autoNextEnabled ? "#00c853" : "#757575";

    autoBtn.onclick = function () {
      autoNextEnabled = !autoNextEnabled;

      this.textContent = autoNextEnabled
        ? "자동 다음: ON"
        : "자동 다음: OFF";

      this.style.background = autoNextEnabled
        ? "#00c853"
        : "#757575";
    };
  }

  if (fullscreenBtn) {
    fullscreenBtn.onclick = function () {
      const videoFrame = document.getElementById("videoFrame");

      if (videoFrame.requestFullscreen) {
        videoFrame.requestFullscreen();
      } else if (videoFrame.webkitRequestFullscreen) {
        videoFrame.webkitRequestFullscreen();
      }
    };
  }
}

/* 저장 / 불러오기 */

function savePlaylist() {
  const name = document.getElementById("playlistName").value.trim();

  if (!name) {
    alert("재생목록 이름을 입력하세요.");
    return;
  }

  const links = splitLinks(document.getElementById("linksInput").value);

  if (links.length === 0) {
    alert("저장할 링크가 없습니다.");
    return;
  }

  const playlists = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "{}");

  playlists[name] = {
    name,
    links,
    updatedAt: Date.now()
  };

  localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists));
  loadPlaylistList();

  alert("저장 완료!");
}

function loadPlaylistList() {
  const select = document.getElementById("playlistSelect");
  if (!select) return;

  select.innerHTML = `<option value="">저장된 재생목록 선택</option>`;

  const playlists = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "{}");

  Object.keys(playlists)
    .sort()
    .forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
}

function loadPlaylist() {
  const name = document.getElementById("playlistSelect").value;

  if (!name) {
    alert("재생목록을 선택하세요.");
    return;
  }

  const playlists = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "{}");
  const saved = playlists[name];

  if (!saved) {
    alert("재생목록을 찾을 수 없습니다.");
    return;
  }

  document.getElementById("linksInput").value = saved.links.join("\n");
  document.getElementById("playlistName").value = saved.name;
}

function deletePlaylist() {
  const name = document.getElementById("playlistSelect").value;

  if (!name) {
    alert("삭제할 재생목록을 선택하세요.");
    return;
  }

  if (!confirm(`"${name}" 재생목록을 삭제할까요?`)) return;

  const playlists = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "{}");
  delete playlists[name];

  localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists));
  loadPlaylistList();

  alert("삭제 완료!");
}

/* QR */

async function scanQrImages() {
  const files = document.getElementById("imageFiles").files;

  if (files.length === 0) {
    alert("사진을 선택해주세요.");
    return;
  }

  await scanFiles(files);
}

async function scanCameraImage() {
  const cameraFile = document.getElementById("cameraFile");
  const files = cameraFile.files;

  if (!files || files.length === 0) return;

  await scanFiles(files);
  cameraFile.value = "";
}

async function scanFiles(files) {
  const results = document.getElementById("results");
  const statusDiv = document.getElementById("status");
  const allLinks = document.getElementById("allLinks");
  const scanBtn = document.getElementById("scanBtn");
  const stopScanBtn = document.getElementById("stopScanBtn");

  if (typeof jsQR === "undefined") {
    alert("QR 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인해주세요.");
    return;
  }

  stopScanRequested = false;
  extractedLinks = [];

  results.innerHTML = "";
  allLinks.value = "";

  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.textContent = "읽는 중...";
  }

  if (stopScanBtn) {
    stopScanBtn.disabled = false;
    stopScanBtn.textContent = "중지";
  }

  statusDiv.innerHTML = `<p>총 ${files.length}개 사진 처리 중...</p>`;

  try {
    for (let i = 0; i < files.length; i++) {
      if (stopScanRequested) {
        statusDiv.innerHTML =
          `<p><b>중지됨.</b> ${extractedLinks.length}개 링크 추출</p>`;
        break;
      }

      const file = files[i];

      statusDiv.innerHTML =
        `<p>${i + 1} / ${files.length} 처리 중... (${file.name})</p>`;

      let result = null;

      try {
        result = await readQrFromImageFile(file);
      } catch (error) {
        console.warn("QR 읽기 실패:", file.name, error);
        result = null;
      }

      if (stopScanRequested) {
        statusDiv.innerHTML =
          `<p><b>중지됨.</b> ${extractedLinks.length}개 링크 추출</p>`;
        break;
      }

      if (result) {
        extractedLinks.push(result);
        addQrResultRow(i, result, true, file.name);
      } else {
        addQrResultRow(i, null, false, file.name);
      }

      allLinks.value = extractedLinks.join("\n");

      await wait(50);
    }

    if (!stopScanRequested) {
      statusDiv.innerHTML =
        `<p><b>완료!</b> ${extractedLinks.length}개 링크 추출</p>`;
    }

  } catch (error) {
    console.error(error);
    statusDiv.innerHTML =
      `<p class="error-text">처리 중 오류가 났어요. 다시 시도해주세요.</p>`;

  } finally {
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = "QR 읽기";
    }

    if (stopScanBtn) {
      stopScanBtn.disabled = true;
      stopScanBtn.textContent = "중지";
    }
  }
}

function addQrResultRow(index, result, success, fileName) {
  const results = document.getElementById("results");

  const row = document.createElement("div");
  row.className = success ? "link-item success" : "link-item error";

  const text = document.createElement("div");
  text.className = "link-text";

  if (success) {
    text.textContent = `${index + 1}. ${result}`;
  } else {
    text.textContent = `${index + 1}. QR 인식 실패 (${fileName})`;
  }

  row.appendChild(text);

  if (success) {
    const addBtn = document.createElement("button");
    addBtn.textContent = "추가";

    addBtn.onclick = () => {
      const linksInput = document.getElementById("linksInput");
      const oldText = linksInput.value.trim();

      linksInput.value = oldText
        ? oldText + "\n" + result
        : result;

      addBtn.textContent = "추가됨!";
      addBtn.disabled = true;
    };

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "복사";

    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(result);
        copyBtn.textContent = "복사됨!";
        setTimeout(() => copyBtn.textContent = "복사", 1000);
      } catch {
        alert("복사 실패. 링크를 직접 복사해주세요.");
      }
    };

    row.appendChild(addBtn);
    row.appendChild(copyBtn);
  }

  results.appendChild(row);
}

function clearLinksInput() {
  const linksInput = document.getElementById("linksInput");

  if (!linksInput.value.trim()) return;

  if (confirm("붙여넣은 링크를 모두 비울까요?")) {
    linksInput.value = "";
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readQrFromImageFile(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 10000);

    img.onload = () => {
      try {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);

        const result =
          safeScanWholeImage(img) ||
          safeScanCenterCrops(img) ||
          safeScanCornerCrops(img) ||
          safeScanThinGridCrops(img) ||
          safeScanGridCrops(img) ||
          safeScanLeftRightCrops(img);

        resolve(result || null);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

function safeScanCanvas(canvas) {
  try {
    if (stopScanRequested) return null;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return null;
    if (canvas.width * canvas.height > 9000000) return null;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(
      imageData.data,
      imageData.width,
      imageData.height,
      { inversionAttempts: "attemptBoth" }
    );

    return code ? code.data : null;
  } catch {
    return null;
  }
}

function safeMakeCanvasFromImage(img, sx, sy, sw, sh, scale = 1) {
  try {
    if (stopScanRequested) return null;

    const maxSide = 3500;

    let width = Math.floor(sw * scale);
    let height = Math.floor(sh * scale);

    if (width <= 0 || height <= 0) return null;

    if (width > maxSide || height > maxSide) {
      const ratio = Math.min(maxSide / width, maxSide / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      img,
      sx, sy, sw, sh,
      0, 0, canvas.width, canvas.height
    );

    return canvas;
  } catch {
    return null;
  }
}

function safeScanWholeImage(img) {
  const scales = [1, 1.5, 2, 3];

  for (const scale of scales) {
    if (stopScanRequested) return null;

    const canvas = safeMakeCanvasFromImage(
      img, 0, 0, img.width, img.height, scale
    );

    const result = safeScanCanvas(canvas);
    if (result) return result;
  }

  return null;
}

function safeScanCenterCrops(img) {
  const cropRates = [0.95, 0.85, 0.75, 0.6, 0.5, 0.4, 0.3];
  const scales = [2, 3, 4];

  for (const rate of cropRates) {
    if (stopScanRequested) return null;

    const size = Math.min(img.width, img.height) * rate;
    const sx = Math.max(0, (img.width - size) / 2);
    const sy = Math.max(0, (img.height - size) / 2);

    for (const scale of scales) {
      if (stopScanRequested) return null;

      const canvas = safeMakeCanvasFromImage(img, sx, sy, size, size, scale);
      const result = safeScanCanvas(canvas);
      if (result) return result;
    }
  }

  return null;
}

function safeScanCornerCrops(img) {
  const scales = [2, 3, 4];
  const sizes = [0.35, 0.45, 0.55, 0.65];

  const corners = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ];

  for (const sizeRate of sizes) {
    if (stopScanRequested) return null;

    const cropSize = Math.min(img.width, img.height) * sizeRate;

    for (const [cx, cy] of corners) {
      if (stopScanRequested) return null;

      const sx = cx === 0 ? 0 : img.width - cropSize;
      const sy = cy === 0 ? 0 : img.height - cropSize;

      for (const scale of scales) {
        if (stopScanRequested) return null;

        const canvas = safeMakeCanvasFromImage(
          img,
          sx,
          sy,
          cropSize,
          cropSize,
          scale
        );

        const result = safeScanCanvas(canvas);
        if (result) return result;
      }
    }
  }

  return null;
}

function safeScanThinGridCrops(img) {
  const scales = [2, 3, 4];
  const cropRate = 0.38;
  const cropSize = Math.min(img.width, img.height) * cropRate;

  const points = [
    0.1, 0.2, 0.3, 0.4, 0.5,
    0.6, 0.7, 0.8, 0.9
  ];

  for (const py of points) {
    if (stopScanRequested) return null;

    for (const px of points) {
      if (stopScanRequested) return null;

      const sx = Math.max(
        0,
        Math.min(img.width - cropSize, img.width * px - cropSize / 2)
      );

      const sy = Math.max(
        0,
        Math.min(img.height - cropSize, img.height * py - cropSize / 2)
      );

      for (const scale of scales) {
        if (stopScanRequested) return null;

        const canvas = safeMakeCanvasFromImage(
          img,
          sx,
          sy,
          cropSize,
          cropSize,
          scale
        );

        const result = safeScanCanvas(canvas);
        if (result) return result;
      }
    }
  }

  return null;
}

function safeScanGridCrops(img) {
  const scales = [2, 3];
  const cropSize = Math.min(img.width, img.height) * 0.5;

  const positions = [
    [0.2, 0.2], [0.5, 0.2], [0.8, 0.2],
    [0.2, 0.5], [0.5, 0.5], [0.8, 0.5],
    [0.2, 0.8], [0.5, 0.8], [0.8, 0.8]
  ];

  for (const [px, py] of positions) {
    if (stopScanRequested) return null;

    const sx = Math.max(0, img.width * px - cropSize / 2);
    const sy = Math.max(0, img.height * py - cropSize / 2);
    const sw = Math.min(cropSize, img.width - sx);
    const sh = Math.min(cropSize, img.height - sy);

    for (const scale of scales) {
      if (stopScanRequested) return null;

      const canvas = safeMakeCanvasFromImage(img, sx, sy, sw, sh, scale);
      const result = safeScanCanvas(canvas);
      if (result) return result;
    }
  }

  return null;
}

function safeScanLeftRightCrops(img) {
  const scales = [2, 3];

  const areas = [
    [0, 0, img.width * 0.5, img.height],
    [img.width * 0.25, 0, img.width * 0.5, img.height],
    [img.width * 0.5, 0, img.width * 0.5, img.height],
    [0, 0, img.width, img.height * 0.5],
    [0, img.height * 0.25, img.width, img.height * 0.5],
    [0, img.height * 0.5, img.width, img.height * 0.5]
  ];

  for (const [sx, sy, sw, sh] of areas) {
    if (stopScanRequested) return null;

    for (const scale of scales) {
      if (stopScanRequested) return null;

      const canvas = safeMakeCanvasFromImage(img, sx, sy, sw, sh, scale);
      const result = safeScanCanvas(canvas);
      if (result) return result;
    }
  }

  return null;
}

async function copyAllQrLinks() {
  if (extractedLinks.length === 0) {
    alert("복사할 링크가 없습니다.");
    return;
  }

  try {
    await navigator.clipboard.writeText(extractedLinks.join("\n"));
    alert("전체 링크 복사 완료!");
  } catch {
    alert("복사 실패. 아래 링크창에서 직접 복사해주세요.");
  }
}

/* 키보드 */

document.addEventListener("keydown", function(e) {
  if (document.getElementById("playerPage").style.display !== "block") return;

  if (e.key === "Enter") nextVideo();

  if (e.key === "Backspace") {
    e.preventDefault();
    prevVideo();
  }

  if (e.key === " ") {
    e.preventDefault();

    if (!player) return;

    const state = player.getPlayerState();

    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }

  if (e.key === "ArrowRight") nextVideo();
  if (e.key === "ArrowLeft") prevVideo();

  if (e.key.toLowerCase() === "a") {
    const autoBtn = document.getElementById("autoBtn");
    if (autoBtn) autoBtn.click();
  }

  if (e.key.toLowerCase() === "f") {
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    if (fullscreenBtn) fullscreenBtn.click();
  }
});

/* 초기 연결 */

document.addEventListener("DOMContentLoaded", function () {
  bindButtons();

  const scanBtn = document.getElementById("scanBtn");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const stopScanBtn = document.getElementById("stopScanBtn");
  const clearLinksBtn = document.getElementById("clearLinksBtn");
  const cameraFile = document.getElementById("cameraFile");
  const cameraBtn = document.getElementById("cameraBtn");

  const savePlaylistBtn = document.getElementById("savePlaylistBtn");
  const loadPlaylistBtn = document.getElementById("loadPlaylistBtn");
  const deletePlaylistBtn = document.getElementById("deletePlaylistBtn");

  if (scanBtn) scanBtn.addEventListener("click", scanQrImages);
  if (copyAllBtn) copyAllBtn.addEventListener("click", copyAllQrLinks);
  if (clearLinksBtn) clearLinksBtn.addEventListener("click", clearLinksInput);
  if (cameraFile) cameraFile.addEventListener("change", scanCameraImage);

  if (cameraBtn && cameraFile) {
    cameraBtn.addEventListener("click", () => {
      cameraFile.click();
    });
  }

  if (stopScanBtn) {
    stopScanBtn.addEventListener("click", function () {
      stopScanRequested = true;
      this.textContent = "중지 중...";
      this.disabled = true;
    });
  }

  if (savePlaylistBtn) savePlaylistBtn.addEventListener("click", savePlaylist);
  if (loadPlaylistBtn) loadPlaylistBtn.addEventListener("click", loadPlaylist);
  if (deletePlaylistBtn) deletePlaylistBtn.addEventListener("click", deletePlaylist);

  loadPlaylistList();
});