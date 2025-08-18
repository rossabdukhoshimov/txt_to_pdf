function getTitleInput() {
  return document.getElementById('docTitle');
}

function getEditor() {
  return document.getElementById('editor');
}

let currentOpenedFilePath = null;
let sizeSelectCached = null;
let selectionWatcherInstalled = false;
// Track unsaved state for close protection
window.__app_isDirty = false;

function getCurrentSizePx() {
  if (!sizeSelectCached) sizeSelectCached = document.getElementById('fontSizeSelect');
  return sizeSelectCached ? sizeSelectCached.value : '12';
}

function replaceFontTagsWithSpans(container, currentPx) {
  if (!container) return;
  const toReplace = container.querySelectorAll('font[size]');
  toReplace.forEach(font => {
    const sizeAttr = String(font.getAttribute('size') || '').trim();
    let px = currentPx || '12';
    // Map legacy 1..7 to px; treat 7 as chosen size
    if (sizeAttr && /^\d+$/.test(sizeAttr)) {
      const n = parseInt(sizeAttr, 10);
      if (n === 7) px = currentPx || px;
      else if (n === 1) px = '10';
      else if (n === 2) px = '11';
      else if (n === 3) px = '12';
      else if (n === 4) px = '14';
      else if (n === 5) px = '16';
      else if (n === 6) px = '18';
    }
    const span = document.createElement('span');
    span.style.fontSize = `${px}px`;
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
}

function withStyleWithCSSDisabled(callback) {
  try { document.execCommand('styleWithCSS', false, false); } catch (_) {}
  try { callback(); } finally {
    try { document.execCommand('styleWithCSS', false, true); } catch (_) {}
  }
}

function findContainerForSelection(range) {
  const editorEl = getEditor();
  if (!editorEl) return null;
  let node = range.commonAncestorContainer;
  while (node && node !== editorEl && node.nodeType !== 1) {
    node = node.parentNode;
  }
  return node && node.nodeType === 1 ? node : editorEl;
}

function ensureCollapsedCaretSize(px) {
  const editorEl = getEditor();
  if (!editorEl) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  // If parent already has font size, skip
  let node = range.startContainer;
  while (node && node !== editorEl) {
    if (node.nodeType === 1 && node instanceof HTMLElement && node.style && node.style.fontSize) {
      return;
    }
    node = node.parentNode;
  }
  const span = document.createElement('span');
  span.style.fontSize = `${px}px`;
  // zero-width space placeholder so caret can sit inside
  span.innerHTML = '&#8203;';
  range.insertNode(span);
  // Move caret inside the span after the placeholder
  const newRange = document.createRange();
  newRange.setStart(span.firstChild, 1);
  newRange.setEnd(span.firstChild, 1);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function applyFontSizePx(px) {
  const editorEl = getEditor();
  if (!editorEl) return;
  editorEl.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const container = findContainerForSelection(range) || editorEl;

  // Clean legacy tags in selection container first
  replaceFontTagsWithSpans(container, px);

  if (range.collapsed) {
    ensureCollapsedCaretSize(px);
    return;
  }

  const contents = range.extractContents();
  const span = document.createElement('span');
  span.style.fontSize = `${px}px`;
  span.appendChild(contents);
  range.insertNode(span);
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function getSelectionContainerElement() {
  const editorEl = getEditor();
  const sel = window.getSelection();
  if (!editorEl || !sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  let node = range.commonAncestorContainer;
  while (node && node !== editorEl && node.nodeType !== 1) {
    node = node.parentNode;
  }
  return node && node.nodeType === 1 ? node : editorEl;
}

function parsePx(pxStr) {
  const n = parseFloat(String(pxStr || '').replace('px', ''));
  return isFinite(n) ? Math.round(n) : null;
}

function updateSizeSelectFromSelection() {
  const sizeSelect = document.getElementById('fontSizeSelect');
  if (!sizeSelect) return;
  const container = getSelectionContainerElement();
  if (!container) return;
  const cs = window.getComputedStyle(container);
  const px = parsePx(cs.fontSize);
  if (!px) return;
  const pxStr = String(px);
  const hasOption = Array.from(sizeSelect.options).some(o => o.value === pxStr);
  if (hasOption) sizeSelect.value = pxStr;
}

function installSelectionWatcher() {
  if (selectionWatcherInstalled) return;
  selectionWatcherInstalled = true;
  document.addEventListener('selectionchange', () => {
    const editorEl = getEditor();
    const sel = window.getSelection();
    if (!editorEl || !sel || sel.rangeCount === 0) return;
    const node = sel.getRangeAt(0).commonAncestorContainer;
    if (!editorEl.contains(node)) return;
    updateSizeSelectFromSelection();
  });
}

function setDocumentContent(title, body) {
  const titleEl = getTitleInput();
  const editorEl = getEditor();
  if (titleEl) titleEl.value = title || '';
  if (editorEl) editorEl.innerHTML = body || '';
}

function getPrintableHTML() {
  const titleEl = getTitleInput();
  const editorEl = getEditor();
  const title = (titleEl?.value || '').trim() || 'Untitled Document';
  const content = editorEl?.innerHTML || '';

  return `
    <section class="printable">
      <h1 style="margin:0 0 12px 0; font-size: 22px;">${title}</h1>
      <div style="height:1px;background:#e5e7eb22;margin:12px 0 18px 0;"></div>
      ${content}
    </section>
  `;
}

function deriveDefaultPdfPath() {
  const titleEl = getTitleInput();
  const title = (titleEl?.value || 'Untitled Document').trim() || 'Untitled Document';
  if (!currentOpenedFilePath) {
    return `${title}.pdf`;
  }
  const parts = currentOpenedFilePath.split('/');
  const fileName = parts.pop() || '';
  const dir = parts.join('/');
  const base = fileName.replace(/\.[^.]+$/, '');
  return `${dir}/${base}.pdf`;
}

async function saveAsPdf() {
  // Swap the page to a printable wrapper, print to PDF, then revert
  const original = document.body.innerHTML;
  const printable = getPrintableHTML();
  const previousTitle = document.title;
  const titleEl = getTitleInput();
  const exportTitle = (titleEl?.value || 'Untitled Document').trim() || 'Untitled Document';
  document.title = exportTitle; // Set PDF metadata title
  const printStyles = `
    <style>
      html, body { background: #ffffff !important; color: #000000 !important; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      .printable { padding: 32px 40px; max-width: 750px; margin: 0 auto; }
      h1 { color: #000000; }
      p, div, li { color: #000000; }
      ul, ol { margin: 0 0 10px 1.25rem; }
      p { margin: 0 0 10px 0; }
      /* Map HTML font size levels (1-7) to readable sizes */
      font[size="1"] { font-size: 10px; }
      font[size="2"] { font-size: 12px; }
      font[size="3"] { font-size: 14px; }
      font[size="4"] { font-size: 16px; }
      font[size="5"] { font-size: 20px; }
      font[size="6"] { font-size: 24px; }
      font[size="7"] { font-size: 32px; }
    </style>
  `;
  document.body.innerHTML = `${printStyles}${printable}`;
  try {
    const result = await window.api.requestSavePdf({ pageSize: 'A4', printBackground: false, defaultPath: deriveDefaultPdfPath() });
    if (!result.ok && !result.canceled) {
      console.error('PDF save failed:', result.error);
    }
    if (result.ok) {
      window.__app_isDirty = false;
    }
    return result;
  } finally {
    document.body.innerHTML = original;
    document.title = previousTitle; // Restore app title
    // Re-bind after DOM restore
    attachHandlers();
  }
}

function attachHandlers() {
  document.getElementById('savePdfBtn').onclick = saveAsPdf;
  document.getElementById('newBtn').onclick = () => {
    setDocumentContent('', '');
    const editorEl = getEditor();
    if (editorEl) editorEl.focus();
    currentOpenedFilePath = null;
  };
  const openBtn = document.getElementById('openBtn');
  if (openBtn) {
    openBtn.onclick = async () => {
      const result = await window.api.openFileDialog();
      if (result && result.ok) {
        currentOpenedFilePath = result.filePath || null;
        const name = (currentOpenedFilePath || '').split('/').pop() || 'Untitled Document';
        setDocumentContent(name.replace(/\.(txt|md|markdown|pdf)$/i, ''), '');
        const editorEl = getEditor();
        if (editorEl) {
          editorEl.innerText = result.content || '';
          editorEl.focus();
        }
      }
    };
  }

  if (window.api) {
    window.api.onNewFile(() => {
      setDocumentContent('', '');
      const editorEl = getEditor();
      if (editorEl) editorEl.focus();
      currentOpenedFilePath = null;
      window.__app_isDirty = false;
    });
    window.api.onOpenFileContent(({ content, filePath }) => {
      const name = (filePath || '').split('/').pop() || 'Untitled Document';
      setDocumentContent(name.replace(/\.(txt|md|markdown)$/i, ''), '');
      const editorEl = getEditor();
      if (editorEl) {
        editorEl.innerText = content || '';
      }
      currentOpenedFilePath = filePath || null;
      window.__app_isDirty = false;
    });
  }

  // Toolbar actions
  document.querySelectorAll('.tlb[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      const editorEl = getEditor();
      if (editorEl) {
        editorEl.focus();
        document.execCommand(cmd, false, null);
        // Normalize any legacy font tags immediately
        replaceFontTagsWithSpans(editorEl, getCurrentSizePx());
        editorEl.focus();
      }
    });
  });
  const sizeSelect = document.getElementById('fontSizeSelect');
  if (sizeSelect) {
    sizeSelect.addEventListener('change', () => {
      const px = sizeSelect.value; // e.g. 10..24
      const editorEl = getEditor();
      if (!editorEl) return;
      applyFontSizePx(px);
      editorEl.focus();
      updateSizeSelectFromSelection();
    });
  }

  const editorEl = getEditor();
  if (editorEl) {
    // Ensure CSS-based styling is preferred where possible
    try { document.execCommand('styleWithCSS', false, true); } catch (_) {}
    editorEl.addEventListener('input', () => {
      // Clean up any <font> tags introduced by execCommand
      replaceFontTagsWithSpans(editorEl, getCurrentSizePx());
      updateSizeSelectFromSelection();
      window.__app_isDirty = true;
    });
  }

  const titleEl = getTitleInput();
  if (titleEl) {
    titleEl.addEventListener('input', () => {
      window.__app_isDirty = true;
    });
  }

  installSelectionWatcher();

  // Handle 'save and close' flow initiated by main process
  if (window.api) {
    window.api.onSaveAndClose(async () => {
      const res = await saveAsPdf();
      if (res && res.ok) {
        await window.api.requestClose();
      }
    });
  }
}

attachHandlers();


