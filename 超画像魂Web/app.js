/**
 * ✨ 超画像魂コンバイン Web Studio - Core Engine (app.js)
 * 
 * 🤖 Generated & Engineered with: Google Gemini
 * 🚀 Web Modernization: Google Gemini (HTML5 Canvas / Vanilla ES6+ / Dark Glassmorphism)
 * 💎 Features: パズルピース型画像結合 ✕ タイル自動整列 ✕ 一括透明化 ✕ 現代フォーマット出力 ✕ *.tilemap互換
 */

(() => {
  'use strict';

  // =========================================================================
  // 1. アプリケーション・グローバルステート
  // =========================================================================
  const state = {
    tileWidth: 32,
    tileHeight: 32,
    canvasCols: 16,
    canvasRows: 16,
    zoom: 1.0,
    minZoom: 0.25,
    maxZoom: 6.0,

    pieces: [],          // スライスされたピース配列 [{ id, canvas, name }]
    selectedPieceId: null, // パレットで選択中のピースID
    selectedCell: null,    // キャンバス上で選択中のセル { col, row }

    // キャンバス上のセルデータ: Map("col_row" => { pieceId, rotation, flipH, flipV })
    gridMap: new Map(),

    // 履歴管理 (Undo / Redo)
    undoStack: [],
    redoStack: [],
    maxHistory: 30,

    // 表示設定
    showGrid: true,
    showChecker: true,

    // スポイトモード
    eyedropperActive: false,
    chromaColor: { r: 0, g: 0, b: 0 },
    chromaTolerance: 15
  };

  // =========================================================================
  // 2. DOM要素の取得
  // =========================================================================
  const DOM = {
    // ツールバー
    btnImport: document.getElementById('btn-import-image'),
    fileInput: document.getElementById('file-input-image'),
    btnOpenProject: document.getElementById('btn-open-project'),
    fileInputProject: document.getElementById('file-input-project'),
    btnSaveProject: document.getElementById('btn-save-project'),
    btnLoadSample: document.getElementById('btn-load-sample'),
    btnUndo: document.getElementById('btn-undo'),
    btnRedo: document.getElementById('btn-redo'),
    btnClear: document.getElementById('btn-clear-canvas'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),
    zoomLabel: document.getElementById('zoom-level-label'),
    btnOpenExport: document.getElementById('btn-open-export-modal'),

    // 左サイドバー (パレット)
    paletteGrid: document.getElementById('palette-grid'),
    paletteEmptyMsg: document.getElementById('palette-empty-msg'),
    pieceCountBadge: document.getElementById('piece-count-badge'),
    sizeChips: document.querySelectorAll('.size-chip'),
    inputCustomW: document.getElementById('custom-tile-w'),
    inputCustomH: document.getElementById('custom-tile-h'),
    btnApplyCustomSize: document.getElementById('btn-apply-custom-size'),
    btnSelectAll: document.getElementById('btn-select-all-pieces'),
    btnDeselect: document.getElementById('btn-deselect-pieces'),

    // キャンバス
    scrollContainer: document.getElementById('canvas-scroll-container'),
    transformWrapper: document.getElementById('canvas-transform-wrapper'),
    mainCanvas: document.getElementById('main-combine-canvas'),
    checkerCanvas: document.getElementById('checker-canvas'),
    gridOverlay: document.getElementById('grid-overlay'),
    chkShowGrid: document.getElementById('chk-show-grid'),
    chkShowChecker: document.getElementById('chk-show-checker'),
    statusText: document.getElementById('canvas-status-text'),
    specText: document.getElementById('canvas-grid-spec'),

    // 右サイドバー (新機能ツール)
    inputAlignCols: document.getElementById('align-columns'),
    btnAlignGrid: document.getElementById('btn-auto-align-grid'),
    btnAlignSquare: document.getElementById('btn-auto-align-square'),

    btnEyedropper: document.getElementById('btn-eyedropper'),
    colorPicker: document.getElementById('chroma-target-color'),
    colorHexText: document.getElementById('chroma-color-hex'),
    sliderTolerance: document.getElementById('chroma-tolerance'),
    toleranceVal: document.getElementById('tolerance-val'),
    colorPresets: document.querySelectorAll('.color-preset-chip'),
    btnApplyChroma: document.getElementById('btn-apply-transparency'),

    btnRotateCW: document.getElementById('btn-rotate-cw'),
    btnFlipH: document.getElementById('btn-flip-h'),
    btnFlipV: document.getElementById('btn-flip-v'),
    btnRemoveSelected: document.getElementById('btn-remove-selected'),

    inputCanvasCols: document.getElementById('canvas-cols'),
    inputCanvasRows: document.getElementById('canvas-rows'),
    btnResizeCanvas: document.getElementById('btn-resize-canvas'),

    // モーダル
    modalExport: document.getElementById('modal-export'),
    btnCloseModal: document.getElementById('btn-close-export-modal'),
    previewCanvas: document.getElementById('export-preview-canvas'),
    exportInfoText: document.getElementById('export-info-text'),
    exportFilename: document.getElementById('export-filename'),
    exportFmtRadios: document.getElementsByName('export-fmt'),
    webpGroup: document.getElementById('webp-quality-group'),
    webpSlider: document.getElementById('webp-quality'),
    webpQualityVal: document.getElementById('webp-quality-val'),
    btnConfirmExport: document.getElementById('btn-confirm-export'),
    btnExportZip: document.getElementById('btn-export-zip'),

    toastContainer: document.getElementById('toast-container')
  };

  // 描画コンテキスト
  const mainCtx = DOM.mainCanvas.getContext('2d');
  const checkerCtx = DOM.checkerCanvas.getContext('2d');
  const previewCtx = DOM.previewCanvas.getContext('2d');

  // =========================================================================
  // 3. 初期化とイベントバインド
  // =========================================================================
  function init() {
    updateCanvasDimensions();
    bindEvents();
    renderAll();
    showToast('超画像魂コンバイン Web Studio 起動完了！', '✨');
  }

  function bindEvents() {
    // ファイル読み込み
    DOM.btnImport.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput.addEventListener('change', handleFileSelect);
    DOM.btnOpenProject.addEventListener('click', () => DOM.fileInputProject.click());
    DOM.fileInputProject.addEventListener('change', handleProjectFileSelect);
    DOM.btnSaveProject.addEventListener('click', saveProject);
    DOM.btnLoadSample.addEventListener('click', loadSampleDungeon);

    // ドラッグ＆ドロップ (ウィンドウ全体)
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', handleWindowDrop);

    // タイルサイズ変更チップ
    DOM.sizeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        DOM.sizeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const s = parseInt(chip.dataset.size, 10);
        state.tileWidth = s;
        state.tileHeight = s;
        DOM.inputCustomW.value = s;
        DOM.inputCustomH.value = s;
        updateCanvasDimensions();
        renderAll();
        showToast(`タイルサイズを ${s}x${s} に変更しました`);
      });
    });

    DOM.btnApplyCustomSize.addEventListener('click', () => {
      const w = Math.max(4, parseInt(DOM.inputCustomW.value, 10) || 32);
      const h = Math.max(4, parseInt(DOM.inputCustomH.value, 10) || 32);
      state.tileWidth = w;
      state.tileHeight = h;
      DOM.sizeChips.forEach(c => c.classList.remove('active'));
      updateCanvasDimensions();
      renderAll();
      showToast(`タイルサイズを ${w}x${h} に設定しました`);
    });

    // ズーム
    DOM.btnZoomIn.addEventListener('click', () => setZoom(state.zoom * 1.25));
    DOM.btnZoomOut.addEventListener('click', () => setZoom(state.zoom / 1.25));
    DOM.btnZoomReset.addEventListener('click', () => setZoom(1.0));
    DOM.scrollContainer.addEventListener('wheel', handleCanvasWheel, { passive: false });

    // 履歴操作
    DOM.btnUndo.addEventListener('click', undo);
    DOM.btnRedo.addEventListener('click', redo);
    DOM.btnClear.addEventListener('click', clearCanvas);

    // グリッド線・透過チェッカー切り替え
    DOM.chkShowGrid.addEventListener('change', (e) => {
      state.showGrid = e.target.checked;
      DOM.gridOverlay.style.display = state.showGrid ? 'block' : 'none';
    });
    DOM.chkShowChecker.addEventListener('change', (e) => {
      state.showChecker = e.target.checked;
      DOM.checkerCanvas.style.display = state.showChecker ? 'block' : 'none';
    });

    // キャンバスリサイズ
    DOM.btnResizeCanvas.addEventListener('click', () => {
      const c = Math.max(1, parseInt(DOM.inputCanvasCols.value, 10) || 16);
      const r = Math.max(1, parseInt(DOM.inputCanvasRows.value, 10) || 16);
      pushHistory();
      state.canvasCols = c;
      state.canvasRows = r;
      updateCanvasDimensions();
      renderAll();
      showToast(`キャンバスを ${c}x${r} タイルに変更しました`);
    });

    // キャンバスインタラクション (クリック、ドラッグ＆ドロップ)
    DOM.gridOverlay.addEventListener('click', handleCanvasClick);
    DOM.gridOverlay.addEventListener('dragover', handleCanvasDragOver);
    DOM.gridOverlay.addEventListener('drop', handleCanvasDrop);

    // 新機能 ①: 自動整列
    DOM.btnAlignGrid.addEventListener('click', () => {
      const cols = Math.max(1, parseInt(DOM.inputAlignCols.value, 10) || 8);
      autoAlignPieces(cols);
    });
    DOM.btnAlignSquare.addEventListener('click', () => {
      autoAlignSquare();
    });

    // 新機能 ②: 透明色一括抜き
    DOM.btnEyedropper.addEventListener('click', toggleEyedropper);
    DOM.colorPicker.addEventListener('input', (e) => {
      updateChromaColor(e.target.value);
    });
    DOM.sliderTolerance.addEventListener('input', (e) => {
      state.chromaTolerance = parseInt(e.target.value, 10);
      DOM.toleranceVal.textContent = state.chromaTolerance;
    });
    DOM.colorPresets.forEach(chip => {
      chip.addEventListener('click', () => {
        updateChromaColor(chip.dataset.color);
      });
    });
    DOM.btnApplyChroma.addEventListener('click', applyTransparencyToAll);

    // 変形操作
    DOM.btnRotateCW.addEventListener('click', rotateSelectedCell);
    DOM.btnFlipH.addEventListener('click', flipHSelectedCell);
    DOM.btnFlipV.addEventListener('click', flipVSelectedCell);
    DOM.btnRemoveSelected.addEventListener('click', removeSelectedCell);

    // パレット選択操作
    DOM.btnSelectAll.addEventListener('click', selectAllPieces);
    DOM.btnDeselect.addEventListener('click', deselectPieces);

    // エクスポートモーダル
    DOM.btnOpenExport.addEventListener('click', openExportModal);
    DOM.btnCloseModal.addEventListener('click', closeExportModal);
    DOM.modalExport.addEventListener('click', (e) => {
      if (e.target === DOM.modalExport) closeExportModal();
    });
    Array.from(DOM.exportFmtRadios).forEach(radio => {
      radio.addEventListener('change', () => {
        DOM.webpGroup.style.display = (radio.value === 'webp' && radio.checked) ? 'flex' : 'none';
      });
    });
    DOM.webpSlider.addEventListener('input', (e) => {
      DOM.webpQualityVal.textContent = `${e.target.value}%`;
    });
    DOM.btnConfirmExport.addEventListener('click', executeExportImage);
    DOM.btnExportZip.addEventListener('click', executeExportZip);

    // キーボードショートカット
    window.addEventListener('keydown', handleKeyShortcuts);
  }

  // =========================================================================
  // 4. キャンバス寸法＆チェッカー背景の更新
  // =========================================================================
  function updateCanvasDimensions() {
    const totalW = state.canvasCols * state.tileWidth;
    const totalH = state.canvasRows * state.tileHeight;

    DOM.mainCanvas.width = totalW;
    DOM.mainCanvas.height = totalH;
    DOM.checkerCanvas.width = totalW;
    DOM.checkerCanvas.height = totalH;

    DOM.transformWrapper.style.width = `${totalW}px`;
    DOM.transformWrapper.style.height = `${totalH}px`;

    // グリッド線のCSS更新
    DOM.gridOverlay.style.backgroundSize = `${state.tileWidth}px ${state.tileHeight}px`;

    // スペック表示
    DOM.specText.textContent = `キャンバス: ${totalW} x ${totalH} px (${state.canvasCols} x ${state.canvasRows} タイル)`;
    DOM.inputCanvasCols.value = state.canvasCols;
    DOM.inputCanvasRows.value = state.canvasRows;

    drawCheckerBackground();
  }

  function drawCheckerBackground() {
    const w = DOM.checkerCanvas.width;
    const h = DOM.checkerCanvas.height;
    const size = 16;
    checkerCtx.clearRect(0, 0, w, h);

    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        checkerCtx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#181b28' : '#10131e';
        checkerCtx.fillRect(x, y, size, size);
      }
    }
  }

  function setZoom(newZoom) {
    state.zoom = Math.min(state.maxZoom, Math.max(state.minZoom, newZoom));
    DOM.transformWrapper.style.transform = `scale(${state.zoom})`;
    DOM.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function handleCanvasWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.15 : 0.85;
      setZoom(state.zoom * delta);
    }
  }

  // =========================================================================
  // 5. 画像スライサー＆ピース生成
  // =========================================================================
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processImageFile(file);
    e.target.value = '';
  }

  function handleWindowDrop(e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.tilemap') || lowerName.endsWith('.json') || lowerName.endsWith('.xml')) {
        loadProjectFile(file);
      } else if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    }
  }

  function loadSampleDungeon() {
    showToast('サンプル画像を読み込み中...', '⏳');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sliceImageToPieces(img, 'sample_dungeon');
      showToast('サンプルダンジョンの読み込みが完了しました！', '🎮');
    };
    img.onerror = () => {
      showToast('サンプル画像が見つかりませんでした', '⚠️');
    };
    img.src = 'sample_dungeon.png';
  }

  function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        sliceImageToPieces(img, file.name);
        showToast(`${file.name} を読み込みました！`, '✨');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function sliceImageToPieces(image, sourceName) {
    const tw = state.tileWidth;
    const th = state.tileHeight;
    const cols = Math.floor(image.width / tw);
    const rows = Math.floor(image.height / th);

    if (cols === 0 || rows === 0) {
      showToast('画像がタイルサイズより小さすぎます', '⚠️');
      return;
    }

    const startIndex = state.pieces.length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = tw;
        offCanvas.height = th;
        const offCtx = offCanvas.getContext('2d');
        offCtx.imageSmoothingEnabled = false;

        offCtx.drawImage(
          image,
          c * tw, r * th, tw, th,
          0, 0, tw, th
        );

        const pieceId = `p_${startIndex + (r * cols + c)}_${Date.now()}`;
        state.pieces.push({
          id: pieceId,
          canvas: offCanvas,
          name: `${sourceName}_x${c}_y${r}`
        });
      }
    }

    updatePaletteView();
  }

  function updatePaletteView() {
    DOM.paletteGrid.innerHTML = '';

    if (state.pieces.length === 0) {
      DOM.paletteEmptyMsg.style.display = 'block';
      DOM.pieceCountBadge.textContent = '0 ピース';
      return;
    }

    DOM.paletteEmptyMsg.style.display = 'none';
    DOM.pieceCountBadge.textContent = `${state.pieces.length} ピース`;

    state.pieces.forEach((piece) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'palette-piece';
      itemEl.dataset.id = piece.id;
      itemEl.draggable = true;

      const imgEl = document.createElement('img');
      imgEl.src = piece.canvas.toDataURL();
      imgEl.alt = piece.name;
      itemEl.appendChild(imgEl);

      if (state.selectedPieceId === piece.id) {
        itemEl.classList.add('selected');
      }

      // クリックで選択
      itemEl.addEventListener('click', () => {
        DOM.paletteGrid.querySelectorAll('.palette-piece').forEach(p => p.classList.remove('selected'));
        if (state.selectedPieceId === piece.id) {
          state.selectedPieceId = null;
        } else {
          state.selectedPieceId = piece.id;
          itemEl.classList.add('selected');
        }
      });

      // ドラッグ開始
      itemEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', piece.id);
        e.dataTransfer.effectAllowed = 'copyMove';
      });

      DOM.paletteGrid.appendChild(itemEl);
    });
  }

  function selectAllPieces() {
    DOM.paletteGrid.querySelectorAll('.palette-piece').forEach(p => p.classList.add('selected'));
    showToast('全ピースを選択しました');
  }

  function deselectPieces() {
    state.selectedPieceId = null;
    DOM.paletteGrid.querySelectorAll('.palette-piece').forEach(p => p.classList.remove('selected'));
  }

  // =========================================================================
  // 6. キャンバス配置＆インタラクション
  // =========================================================================
  function getCellCoordFromEvent(e) {
    const rect = DOM.gridOverlay.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scaleX = DOM.mainCanvas.width / rect.width;
    const scaleY = DOM.mainCanvas.height / rect.height;

    const canvasX = clientX * scaleX;
    const canvasY = clientY * scaleY;

    const col = Math.floor(canvasX / state.tileWidth);
    const row = Math.floor(canvasY / state.tileHeight);

    if (col >= 0 && col < state.canvasCols && row >= 0 && row < state.canvasRows) {
      return { col, row };
    }
    return null;
  }

  function handleCanvasClick(e) {
    if (state.eyedropperActive) {
      pickColorFromCanvas(e);
      return;
    }

    const cell = getCellCoordFromEvent(e);
    if (!cell) return;

    const key = `${cell.col}_${cell.row}`;

    // パレットでピースが選択されている場合はスタンプ配置
    if (state.selectedPieceId) {
      pushHistory();
      state.gridMap.set(key, {
        pieceId: state.selectedPieceId,
        rotation: 0,
        flipH: false,
        flipV: false
      });
      state.selectedCell = cell;
      renderAll();
    } else {
      // 既存セルの選択
      if (state.gridMap.has(key)) {
        state.selectedCell = cell;
        highlightSelectedCell(cell);
      } else {
        state.selectedCell = null;
        removeHighlight();
      }
    }
  }

  function handleCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleCanvasDrop(e) {
    e.preventDefault();
    const cell = getCellCoordFromEvent(e);
    if (!cell) return;

    const pieceId = e.dataTransfer.getData('text/plain');
    if (pieceId) {
      pushHistory();
      const key = `${cell.col}_${cell.row}`;
      state.gridMap.set(key, {
        pieceId: pieceId,
        rotation: 0,
        flipH: false,
        flipV: false
      });
      state.selectedCell = cell;
      renderAll();
      showToast(`タイルを (${cell.col}, ${cell.row}) に配置しました`);
    }
  }

  function highlightSelectedCell(cell) {
    removeHighlight();
    const el = document.createElement('div');
    el.className = 'grid-cell-highlight';
    el.id = 'cell-highlight-box';
    el.style.left = `${cell.col * state.tileWidth}px`;
    el.style.top = `${cell.row * state.tileHeight}px`;
    el.style.width = `${state.tileWidth}px`;
    el.style.height = `${state.tileHeight}px`;
    DOM.gridOverlay.appendChild(el);
  }

  function removeHighlight() {
    const el = document.getElementById('cell-highlight-box');
    if (el) el.remove();
  }

  // 変形操作
  function rotateSelectedCell() {
    if (!state.selectedCell) return;
    const key = `${state.selectedCell.col}_${state.selectedCell.row}`;
    const data = state.gridMap.get(key);
    if (data) {
      pushHistory();
      data.rotation = (data.rotation + 90) % 360;
      renderAll();
    }
  }

  function flipHSelectedCell() {
    if (!state.selectedCell) return;
    const key = `${state.selectedCell.col}_${state.selectedCell.row}`;
    const data = state.gridMap.get(key);
    if (data) {
      pushHistory();
      data.flipH = !data.flipH;
      renderAll();
    }
  }

  function flipVSelectedCell() {
    if (!state.selectedCell) return;
    const key = `${state.selectedCell.col}_${state.selectedCell.row}`;
    const data = state.gridMap.get(key);
    if (data) {
      pushHistory();
      data.flipV = !data.flipV;
      renderAll();
    }
  }

  function removeSelectedCell() {
    if (!state.selectedCell) return;
    const key = `${state.selectedCell.col}_${state.selectedCell.row}`;
    if (state.gridMap.has(key)) {
      pushHistory();
      state.gridMap.delete(key);
      state.selectedCell = null;
      removeHighlight();
      renderAll();
      showToast('タイルを削除しました');
    }
  }

  function clearCanvas() {
    if (state.gridMap.size === 0) return;
    if (confirm('キャンバスの配置をすべてクリアしますか？')) {
      pushHistory();
      state.gridMap.clear();
      state.selectedCell = null;
      removeHighlight();
      renderAll();
      showToast('キャンバスをクリアしました');
    }
  }

  // =========================================================================
  // 7. 新機能 ①: タイルの自動整列機能 (Auto-Grid Smart Alignment)
  // =========================================================================
  function autoAlignPieces(columns) {
    if (state.pieces.length === 0) {
      showToast('配置するピースがありません。先に画像を読み込んでください', '⚠️');
      return;
    }

    pushHistory();
    state.gridMap.clear();

    const cols = Math.max(1, columns);
    const rows = Math.ceil(state.pieces.length / cols);

    // キャンバスサイズが足りない場合は自動拡張
    if (cols > state.canvasCols || rows > state.canvasRows) {
      state.canvasCols = Math.max(state.canvasCols, cols);
      state.canvasRows = Math.max(state.canvasRows, rows);
      updateCanvasDimensions();
    }

    state.pieces.forEach((piece, index) => {
      const c = index % cols;
      const r = Math.floor(index / cols);
      state.gridMap.set(`${c}_${r}`, {
        pieceId: piece.id,
        rotation: 0,
        flipH: false,
        flipV: false
      });
    });

    renderAll();
    showToast(`${state.pieces.length} ピースを ${cols} 列で自動整列しました！`, '⚡');
  }

  function autoAlignSquare() {
    if (state.pieces.length === 0) {
      showToast('配置するピースがありません', '⚠️');
      return;
    }
    // 最も正方形に近い列数を算出 (sqrt)
    const squareCols = Math.ceil(Math.sqrt(state.pieces.length));
    autoAlignPieces(squareCols);
  }

  // =========================================================================
  // 8. 新機能 ②: 透明色の一括抜き (Chroma Key & Magic Wand)
  // =========================================================================
  function toggleEyedropper() {
    if (window.EyeDropper) {
      const eyeDropper = new EyeDropper();
      eyeDropper.open().then(result => {
        updateChromaColor(result.sRGBHex);
        showToast(`色を取得しました: ${result.sRGBHex}`, '🧪');
      }).catch(() => {});
    } else {
      state.eyedropperActive = !state.eyedropperActive;
      if (state.eyedropperActive) {
        DOM.btnEyedropper.classList.add('primary-glow');
        showToast('キャンバス上をクリックして透明化したい色を抽出してください', '🧪');
      } else {
        DOM.btnEyedropper.classList.remove('primary-glow');
      }
    }
  }

  function pickColorFromCanvas(e) {
    const rect = DOM.gridOverlay.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (DOM.mainCanvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (DOM.mainCanvas.height / rect.height));

    const p = mainCtx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(p[0], p[1], p[2]);
    updateChromaColor(hex);

    state.eyedropperActive = false;
    DOM.btnEyedropper.classList.remove('primary-glow');
    showToast(`色を抽出しました: ${hex}`, '🧪');
  }

  function updateChromaColor(hex) {
    DOM.colorPicker.value = hex;
    DOM.colorHexText.textContent = hex.toUpperCase();
    const rgb = hexToRgb(hex);
    if (rgb) state.chromaColor = rgb;
  }

  function applyTransparencyToAll() {
    if (state.pieces.length === 0) {
      showToast('透明化を適用するピースがありません', '⚠️');
      return;
    }

    pushHistory();
    const target = state.chromaColor;
    const tolSq = Math.pow((state.chromaTolerance / 100) * 441.67, 2); // ユークリッド距離の2乗

    let modifiedCount = 0;

    state.pieces.forEach(piece => {
      const pCtx = piece.canvas.getContext('2d');
      const imgData = pCtx.getImageData(0, 0, piece.canvas.width, piece.canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        // すでに透明ならスキップ
        if (data[i + 3] === 0) continue;

        const dr = data[i] - target.r;
        const dg = data[i + 1] - target.g;
        const db = data[i + 2] - target.b;
        const distSq = dr * dr + dg * dg + db * db;

        if (distSq <= tolSq) {
          data[i + 3] = 0; // 完全透明化
        }
      }

      pCtx.putImageData(imgData, 0, 0);
      modifiedCount++;
    });

    updatePaletteView();
    renderAll();
    showToast(`全 ${modifiedCount} ピースの透明色一括抜きを完了しました！`, '🪄');
  }

  // =========================================================================
  // 9. 描画レンダリングエンジン
  // =========================================================================
  function renderAll() {
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.clearRect(0, 0, DOM.mainCanvas.width, DOM.mainCanvas.height);

    const pieceMap = new Map();
    state.pieces.forEach(p => pieceMap.set(p.id, p));

    state.gridMap.forEach((val, key) => {
      const [col, row] = key.split('_').map(Number);
      const piece = pieceMap.get(val.pieceId);
      if (!piece) return;

      const destX = col * state.tileWidth;
      const destY = row * state.tileHeight;

      mainCtx.save();
      mainCtx.translate(destX + state.tileWidth / 2, destY + state.tileHeight / 2);

      if (val.rotation !== 0) {
        mainCtx.rotate((val.rotation * Math.PI) / 180);
      }
      if (val.flipH || val.flipV) {
        mainCtx.scale(val.flipH ? -1 : 1, val.flipV ? -1 : 1);
      }

      mainCtx.drawImage(
        piece.canvas,
        -state.tileWidth / 2,
        -state.tileHeight / 2,
        state.tileWidth,
        state.tileHeight
      );

      mainCtx.restore();
    });

    if (state.selectedCell) {
      highlightSelectedCell(state.selectedCell);
    }
  }

  // =========================================================================
  // 10. 新機能 ③: 現代画像フォーマット対応エクスポート (PNG32 / WebP / SVG / ZIP)
  // =========================================================================
  function openExportModal() {
    if (state.gridMap.size === 0) {
      showToast('エクスポートする画像が配置されていません', '⚠️');
      return;
    }

    // プレビュー生成
    DOM.previewCanvas.width = DOM.mainCanvas.width;
    DOM.previewCanvas.height = DOM.mainCanvas.height;
    previewCtx.clearRect(0, 0, DOM.previewCanvas.width, DOM.previewCanvas.height);
    previewCtx.drawImage(DOM.mainCanvas, 0, 0);

    DOM.exportInfoText.textContent = `サイズ: ${DOM.mainCanvas.width} x ${DOM.mainCanvas.height} px (${state.gridMap.size} タイル配置済)`;
    DOM.modalExport.classList.remove('hidden');
  }

  function closeExportModal() {
    DOM.modalExport.classList.add('hidden');
  }

  async function executeExportImage() {
    const fmtRadio = Array.from(DOM.exportFmtRadios).find(r => r.checked);
    const fmt = fmtRadio ? fmtRadio.value : 'png';
    const filename = (DOM.exportFilename.value.trim() || 'ChouGazo_Combined');

    if (fmt === 'svg') {
      await exportAsSVG(filename);
      closeExportModal();
      return;
    }

    let mimeType = 'image/png';
    let ext = '.png';
    let quality = undefined;

    if (fmt === 'webp') {
      mimeType = 'image/webp';
      ext = '.webp';
      quality = parseInt(DOM.webpSlider.value, 10) / 100;
    }

    const defaultName = `${filename}${ext}`;

    // File System Access API (名前を付けて保存ダイアログ)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: fmt === 'webp' ? 'WebP 画像 (*.webp)' : 'PNG 画像 (*.png)',
            accept: { [mimeType]: [ext] }
          }]
        });
        const blob = await new Promise(resolve => DOM.mainCanvas.toBlob(resolve, mimeType, quality));
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        closeExportModal();
        showToast(`${handle.name} を保存しました！`, '💾');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker fallback:', err);
      }
    }

    // 通常ダウンロードへのフォールバック
    const dataUrl = DOM.mainCanvas.toDataURL(mimeType, quality);
    const link = document.createElement('a');
    link.download = defaultName;
    link.href = dataUrl;
    link.click();

    closeExportModal();
    showToast(`${defaultName} をダウンロードしました！`, '💾');
  }

  async function exportAsSVG(filename) {
    const w = DOM.mainCanvas.width;
    const h = DOM.mainCanvas.height;
    const pngDataUrl = DOM.mainCanvas.toDataURL('image/png');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" xlink:href="${pngDataUrl}" />
</svg>`;

    const defaultName = `${filename}.svg`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'SVG ベクター画像 (*.svg)',
            accept: { 'image/svg+xml': ['.svg'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(svgContent);
        await writable.close();
        showToast(`${handle.name} を保存しました！`, '💾');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker fallback:', err);
      }
    }

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = defaultName;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    showToast(`${defaultName} をダウンロードしました！`, '💾');
  }

  async function executeExportZip() {
    if (!window.JSZip) {
      showToast('ZIPライブラリが読み込まれていません', '⚠️');
      return;
    }

    showToast('個別タイルのZIPアーカイブを生成中...', '📦');
    const zip = new JSZip();
    const filename = (DOM.exportFilename.value.trim() || 'ChouGazo_Tiles');
    const pieceMap = new Map();
    state.pieces.forEach(p => pieceMap.set(p.id, p));

    let count = 0;
    state.gridMap.forEach((val, key) => {
      const [col, row] = key.split('_').map(Number);
      const piece = pieceMap.get(val.pieceId);
      if (!piece) return;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = state.tileWidth;
      offCanvas.height = state.tileHeight;
      const offCtx = offCanvas.getContext('2d');

      offCtx.save();
      offCtx.translate(state.tileWidth / 2, state.tileHeight / 2);
      if (val.rotation !== 0) offCtx.rotate((val.rotation * Math.PI) / 180);
      if (val.flipH || val.flipV) offCtx.scale(val.flipH ? -1 : 1, val.flipV ? -1 : 1);
      offCtx.drawImage(piece.canvas, -state.tileWidth / 2, -state.tileHeight / 2);
      offCtx.restore();

      const base64 = offCanvas.toDataURL('image/png').split(',')[1];
      zip.file(`tile_x${col}_y${row}.png`, base64, { base64: true });
      count++;
    });

    const contentBlob = await zip.generateAsync({ type: 'blob' });
    const defaultName = `${filename}_tiles.zip`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'ZIP アーカイブ (*.zip)',
            accept: { 'application/zip': ['.zip'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(contentBlob);
        await writable.close();
        closeExportModal();
        showToast(`${count} 個のタイルを保存しました！`, '📦');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker fallback:', err);
      }
    }

    const url = URL.createObjectURL(contentBlob);
    const link = document.createElement('a');
    link.download = defaultName;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    closeExportModal();
    showToast(`${count} 個のタイルをZIP保存しました！`, '📦');
  }

  // =========================================================================
  // 11. 履歴管理 (Undo / Redo)
  // =========================================================================
  function pushHistory() {
    const snapshot = {
      gridMap: new Map(state.gridMap),
      cols: state.canvasCols,
      rows: state.canvasRows
    };
    state.undoStack.push(snapshot);
    if (state.undoStack.length > state.maxHistory) {
      state.undoStack.shift();
    }
    state.redoStack = [];
    updateUndoRedoUI();
  }

  function undo() {
    if (state.undoStack.length === 0) return;
    const current = {
      gridMap: new Map(state.gridMap),
      cols: state.canvasCols,
      rows: state.canvasRows
    };
    state.redoStack.push(current);

    const prev = state.undoStack.pop();
    state.gridMap = new Map(prev.gridMap);
    state.canvasCols = prev.cols;
    state.canvasRows = prev.rows;
    state.selectedCell = null;
    removeHighlight();
    updateCanvasDimensions();
    renderAll();
    updateUndoRedoUI();
    showToast('元に戻しました (Undo)');
  }

  function redo() {
    if (state.redoStack.length === 0) return;
    const current = {
      gridMap: new Map(state.gridMap),
      cols: state.canvasCols,
      rows: state.canvasRows
    };
    state.undoStack.push(current);

    const next = state.redoStack.pop();
    state.gridMap = new Map(next.gridMap);
    state.canvasCols = next.cols;
    state.canvasRows = next.rows;
    state.selectedCell = null;
    removeHighlight();
    updateCanvasDimensions();
    renderAll();
    updateUndoRedoUI();
    showToast('やり直しました (Redo)');
  }

  function updateUndoRedoUI() {
    DOM.btnUndo.disabled = state.undoStack.length === 0;
    DOM.btnRedo.disabled = state.redoStack.length === 0;
  }

  function handleKeyShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveProject();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      DOM.fileInputProject.click();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedCell && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        removeSelectedCell();
      }
    }
  }

  // =========================================================================
  // 12. プロジェクト保存 ＆ 互換復元エンジン (*.tilemap / JSON / XML)
  // =========================================================================
  async function saveProject() {
    // ピースのCanvasデータをDataURL化
    const serializedPieces = state.pieces.map(p => ({
      id: p.id,
      name: p.name,
      dataUrl: p.canvas.toDataURL('image/png')
    }));

    // グリッド上の配置データをシリアライズ
    const serializedGrid = [];
    state.gridMap.forEach((val, key) => {
      serializedGrid.push({
        key, // "col_row"
        pieceId: val.pieceId,
        rotation: val.rotation || 0,
        flipH: !!val.flipH,
        flipV: !!val.flipV
      });
    });

    const projectData = {
      app: "ChouGazoTamashiiCombine",
      formatVersion: "2.1",
      timestamp: new Date().toISOString(),
      gridSetting: {
        chipX: state.tileWidth,
        chipY: state.tileHeight,
        tileX: state.canvasCols,
        tileY: state.canvasRows,
        dpi: 96,
        backgroundColor: state.chromaColor
      },
      pieces: serializedPieces,
      placedTiles: serializedGrid
    };

    const jsonString = JSON.stringify(projectData, null, 2);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const defaultName = `project_${dateStr}.tilemap`;

    // File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'タイルマッププロジェクト (*.tilemap)',
            accept: { 'application/json': ['.tilemap', '.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        showToast(`${handle.name} を保存しました！`, '💾');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker fallback:', err);
      }
    }

    // フォールバック: 通常のダウンロード
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = defaultName;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);

    showToast('プロジェクトを保存しました (*.tilemap)', '💾');
  }

  function handleProjectFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      loadProjectFile(file);
    }
    e.target.value = '';
  }

  function loadProjectFile(file) {
    showToast(`${file.name} を読み込み中...`, '⏳');
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;
      // XML判定 (デスクトップ版の *.tilemap)
      if (content.trim().startsWith('<') || content.includes('xmlns:') || content.includes('<GridSetting>')) {
        loadLegacyXmlTilemap(content, file.name);
      } else {
        // JSON判定 (Web版 *.tilemap / *.json)
        try {
          const json = JSON.parse(content);
          loadModernJsonProject(json, file.name);
        } catch (err) {
          console.error("Project parse error:", err);
          showToast('プロジェクトの解析に失敗しました。ファイル形式を確認してください。', '⚠️');
        }
      }
    };

    reader.readAsText(file);
  }

  function loadModernJsonProject(json, fileName) {
    pushHistory();
    // 設定復元
    if (json.gridSetting) {
      state.tileWidth = json.gridSetting.chipX || json.tileWidth || 32;
      state.tileHeight = json.gridSetting.chipY || json.tileHeight || 32;
      state.canvasCols = json.gridSetting.tileX || json.canvasCols || 16;
      state.canvasRows = json.gridSetting.tileY || json.canvasRows || 16;
    } else {
      state.tileWidth = json.tileWidth || 32;
      state.tileHeight = json.tileHeight || 32;
      state.canvasCols = json.canvasCols || 16;
      state.canvasRows = json.canvasRows || 16;
    }

    DOM.inputCustomW.value = state.tileWidth;
    DOM.inputCustomH.value = state.tileHeight;
    DOM.sizeChips.forEach(c => {
      c.classList.toggle('active', parseInt(c.dataset.size, 10) === state.tileWidth && state.tileWidth === state.tileHeight);
    });

    updateCanvasDimensions();

    // ピースの読み込み
    const piecesData = json.pieces || [];
    state.pieces = [];
    state.gridMap.clear();

    if (piecesData.length === 0) {
      renderPalette();
      renderAll();
      showToast(`プロジェクト設定を復元しました (${fileName})`, '📂');
      return;
    }

    let loadedCount = 0;
    piecesData.forEach((pData) => {
      const img = new Image();
      img.onload = () => {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = state.tileWidth;
        pCanvas.height = state.tileHeight;
        const pCtx = pCanvas.getContext('2d');
        pCtx.drawImage(img, 0, 0, state.tileWidth, state.tileHeight);

        state.pieces.push({
          id: pData.id || `piece_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: pData.name || `piece_${loadedCount}`,
          canvas: pCanvas
        });

        loadedCount++;
        if (loadedCount === piecesData.length) {
          // グリッド配置復元
          if (Array.isArray(json.placedTiles)) {
            json.placedTiles.forEach(t => {
              state.gridMap.set(t.key, {
                pieceId: t.pieceId,
                rotation: t.rotation || 0,
                flipH: !!t.flipH,
                flipV: !!t.flipV
              });
            });
          }
          renderPalette();
          renderAll();
          showToast(`プロジェクトを完全復元しました！（${state.pieces.length} ピース）`, '🎉');
        }
      };
      img.src = pData.dataUrl;
    });
  }

  function loadLegacyXmlTilemap(xmlText, fileName) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      // GridSetting の解析
      let chipX = 32, chipY = 32, tileX = 16, tileY = 16;
      const chipXNode = doc.querySelector('ChipX') || doc.querySelector('cellW');
      const chipYNode = doc.querySelector('ChipY') || doc.querySelector('cellH');
      const tileXNode = doc.querySelector('TileX') || doc.querySelector('MaxCellX');
      const tileYNode = doc.querySelector('TileY') || doc.querySelector('MaxCellY');

      if (chipXNode) chipX = parseInt(chipXNode.textContent, 10) || 32;
      if (chipYNode) chipY = parseInt(chipYNode.textContent, 10) || 32;
      if (tileXNode) tileX = parseInt(tileXNode.textContent, 10) || 16;
      if (tileYNode) tileY = parseInt(tileYNode.textContent, 10) || 16;

      pushHistory();
      state.tileWidth = chipX;
      state.tileHeight = chipY;
      state.canvasCols = tileX;
      state.canvasRows = tileY;

      DOM.inputCustomW.value = chipX;
      DOM.inputCustomH.value = chipY;
      DOM.sizeChips.forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.size, 10) === chipX && chipX === chipY);
      });

      updateCanvasDimensions();
      renderAll();

      showToast(`デスクトップ版 *.tilemap を解析しました！(${chipX}x${chipY}px, ${tileX}x${tileY}マス) 画像をD&Dして作業を継続できます`, '🏛️');
    } catch (err) {
      console.error("XML parse error:", err);
      showToast('デスクトップ版 *.tilemap の解析に失敗しました。', '⚠️');
    }
  }

  // =========================================================================
  // 12. ユーティリティ関数
  // =========================================================================
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function showToast(message, icon = '✨') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // 起動
  window.addEventListener('DOMContentLoaded', init);
})();
