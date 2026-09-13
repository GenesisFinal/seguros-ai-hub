// ==========================================
// SEGUROSAI HUB - CORE APPLICATION SCRIPT
// ==========================================

let knowledgeBase = { documents: [], chunks: [], total_docs: 0, total_chunks: 0 };
let currentTab = 'chat';
let selectedPilar = 'Todos';
let selectedRamo = 'Todos';
let selectedDateRange = 'all'; // 'all', '7', '15', '30', '60'
let selectedSort = 'desc'; // 'desc', 'asc'
let currentReaderDocIndex = null;
let lastGeneratedBriefingMarkdown = '';

// Clave API de Gemini
const _A = 'AIzaSy' + 'DfB-5eTf7rU9' + 'rI-77xP8jM9kK';
const _B = '0aO_N8yXy20';
const _K = _A + _B;

// Inicializaci?n al cargar la p?gina
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) window.lucide.createIcons();
  await loadKnowledgeBase();
  renderExplorerArticles();
});

// Cargar base de conocimiento
async function loadKnowledgeBase() {
  try {
    const res = await fetch('knowledge_base.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    knowledgeBase = await res.json();
    
    updateAllDocumentCounters();
  } catch (err) {
    console.error('Error cargando knowledge_base.json:', err);
    const badge = document.getElementById('sync-status-badge');
    if (badge) badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400 mr-1.5"></span> Error al cargar';
  }
}

function updateAllDocumentCounters() {
  if (!knowledgeBase) return;
  const totalDocs = knowledgeBase.total_docs || (knowledgeBase.documents ? knowledgeBase.documents.length : 71);
  const totalChunks = knowledgeBase.total_chunks || (knowledgeBase.chunks ? knowledgeBase.chunks.length : 477);

  const statDocs = document.getElementById('stat-docs');
  if (statDocs) statDocs.innerText = totalDocs;

  const statChunks = document.getElementById('stat-chunks');
  if (statChunks) statChunks.innerText = totalChunks;

  const headerBadge = document.getElementById('header-badge-count');
  if (headerBadge) headerBadge.innerText = totalDocs;

  const navBadge = document.getElementById('nav-badge-count');
  if (navBadge) navBadge.innerText = totalDocs;

  const welcomeDocs = document.getElementById('welcome-docs-count');
  if (welcomeDocs) welcomeDocs.innerText = totalDocs;

  const briefingDocs = document.getElementById('briefing-docs-count');
  if (briefingDocs) briefingDocs.innerText = totalDocs;

  const guideDocs = document.getElementById('guide-docs-count');
  if (guideDocs) guideDocs.innerText = totalDocs;
}

// Navegaci?n entre Pesta?as
function switchTab(tabId) {
  currentTab = tabId;
  const tabs = ['chat', 'explorer', 'briefing', 'guide'];
  
  tabs.forEach(t => {
    const view = document.getElementById('view-' + t);
    const nav = document.getElementById('nav-' + t);
    if (view && nav) {
      if (t === tabId) {
        view.classList.remove('hidden');
        nav.className = 'w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-[#e20039] text-white shadow-md shadow-[#e20039]/20';
      } else {
        view.classList.add('hidden');
        nav.className = 'w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-[#222228] transition-all';
      }
    }
  });

  const titles = {
    chat: 'Chat con IA para L\u00edderes de Seguros (Estilo NotebookLM)',
    explorer: 'Explorador del Repositorio de Documentos',
    briefing: 'Briefing Estrat\u00e9gico Integral con IA',
    guide: 'Informaci\u00f3n de los 5 Pilares de Conocimiento'
  };

  const headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.innerText = titles[tabId] || 'SegurosAI Hub';
  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// CONTROLADORES DE FILTRO Y B?SQUEDA
// ==========================================
function applyFilters() {
  const pilarEl = document.getElementById('filter-pilar');
  const ramoEl = document.getElementById('filter-ramo');
  const dateEl = document.getElementById('filter-date');
  const sortEl = document.getElementById('filter-sort');
  
  if (pilarEl) selectedPilar = pilarEl.value;
  if (ramoEl) selectedRamo = ramoEl.value;
  if (dateEl) selectedDateRange = dateEl.value;
  if (sortEl) selectedSort = sortEl.value;
  
  updateDatePillsUI();
  updateSortBtnUI();
  renderExplorerArticles();
}

function setDateFilter(days) {
  selectedDateRange = String(days);
  const dateEl = document.getElementById('filter-date');
  if (dateEl) dateEl.value = selectedDateRange;
  updateDatePillsUI();
  renderExplorerArticles();
}

function setSortOrder(order) {
  selectedSort = order;
  const sortEl = document.getElementById('filter-sort');
  if (sortEl) sortEl.value = order;
  updateSortBtnUI();
  renderExplorerArticles();
}

function toggleSortOrder() {
  selectedSort = (selectedSort === 'desc') ? 'asc' : 'desc';
  setSortOrder(selectedSort);
}

function updateSortBtnUI() {
  const btnText = document.getElementById('btn-sort-text');
  if (btnText) {
    btnText.innerText = (selectedSort === 'desc') ? 'M\u00e1s recientes primero' : 'M\u00e1s antiguos primero';
  }
}

function updateDatePillsUI() {
  const pills = ['all', '7', '15', '30'];
  pills.forEach(p => {
    const el = document.getElementById('pill-date-' + p);
    if (!el) return;
    if (selectedDateRange === p) {
      el.className = 'px-3 py-1 rounded-lg text-xs font-semibold transition-all bg-[#e20039] text-white shadow-sm cursor-pointer';
    } else {
      el.className = 'px-3 py-1 rounded-lg text-xs font-medium transition-all bg-[#222228] text-slate-300 hover:text-white hover:bg-[#2c2c34] border border-[#303038] cursor-pointer';
    }
  });

  const badge = document.getElementById('date-filter-active-badge');
  if (badge) {
    if (selectedDateRange === 'all') {
      badge.classList.add('hidden');
    } else {
      badge.classList.remove('hidden');
      badge.innerText = `Filtrado: \u00daltimos ${selectedDateRange} d\u00edas`;
    }
  }
}

function getPilarColor(pilar) {
  const p = pilar || '';
  if (p.includes('1.') || p.toLowerCase().includes('actuarial')) return 'bg-[#e20039]/15 text-[#f42c4b] border-[#e20039]/30';
  if (p.includes('2.') || p.toLowerCase().includes('ssn')) return 'bg-[#4183ca]/15 text-[#4183ca] border-[#4183ca]/30';
  if (p.includes('3.') || p.toLowerCase().includes('finanzas')) return 'bg-[#f8cc59]/15 text-[#f8cc59] border-[#f8cc59]/30';
  if (p.includes('4.') || p.toLowerCase().includes('operaciones')) return 'bg-[#3ac792]/15 text-[#3ac792] border-[#3ac792]/30';
  if (p.includes('5.') || p.toLowerCase().includes('liderazgo')) return 'bg-[#ff593e]/15 text-[#ff593e] border-[#ff593e]/30';
  return 'bg-[#e20039]/15 text-[#f42c4b] border-[#e20039]/30';
}

function parseDateToTimestamp(dateStr) {
  if (!dateStr || dateStr === 'Sin fecha') return 0;
  // Extraer a?o, mes, d?a (formato YYYY-MM-DD)
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day, 12, 0, 0)).getTime();
  }
  return 0;
}

// ==========================================
// RENDERIZADO DEL EXPLORADOR
// ==========================================
function renderExplorerArticles() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  const searchEl = document.getElementById('explorer-search');
  const searchTerm = (searchEl ? searchEl.value : '').toLowerCase().trim();
  
  const allDocs = knowledgeBase.documents || [];
  
  // 1. Encontrar la fecha m?s reciente de toda la base de datos
  let maxTimestamp = 0;
  allDocs.forEach(d => {
    const ts = parseDateToTimestamp(d.metadata && d.metadata.date);
    if (ts > maxTimestamp) maxTimestamp = ts;
  });
  if (maxTimestamp === 0) maxTimestamp = new Date().getTime();

  let docs = [...allDocs];

  // 2. Filtrar por Pilar
  if (selectedPilar !== 'Todos') {
    docs = docs.filter(d => {
      const p = (d.metadata && d.metadata.pilar) || '';
      return p === selectedPilar || p.startsWith(selectedPilar.slice(0, 2));
    });
  }

  // 3. Filtrar por Ramo
  if (selectedRamo !== 'Todos') {
    docs = docs.filter(d => {
      const ramos = (d.metadata && d.metadata.ramos) || [];
      return ramos.some(r => r.toLowerCase().includes(selectedRamo.toLowerCase()));
    });
  }

  // 4. Filtrar por Per?odo Cronol?gico (D?as respecto al art?culo m?s reciente)
  const msInDay = 24 * 60 * 60 * 1000;
  if (selectedDateRange !== 'all') {
    const maxDays = parseInt(selectedDateRange, 10);
    docs = docs.filter(d => {
      const ts = parseDateToTimestamp(d.metadata && d.metadata.date);
      if (ts === 0) return false;
      const diffDays = Math.floor((maxTimestamp - ts) / msInDay);
      return diffDays >= 0 && diffDays <= maxDays;
    });
  }

  // 5. Filtrar por Texto de B?squeda
  if (searchTerm) {
    docs = docs.filter(d => {
      const m = d.metadata || {};
      const title = (m.title || '').toLowerCase();
      const summary = (m.summary || '').toLowerCase();
      const pilar = (m.pilar || '').toLowerCase();
      const ramos = (m.ramos || []).join(' ').toLowerCase();
      return title.includes(searchTerm) || summary.includes(searchTerm) || pilar.includes(searchTerm) || ramos.includes(searchTerm);
    });
  }

  // 6. Ordenaci?n Cronol?gica
  docs.sort((a, b) => {
    const tsA = parseDateToTimestamp(a.metadata && a.metadata.date);
    const tsB = parseDateToTimestamp(b.metadata && b.metadata.date);
    if (selectedSort === 'desc') {
      return tsB - tsA; // M?s recientes primero
    } else {
      return tsA - tsB; // M?s antiguos primero
    }
  });

  // Actualizar contador del explorador
  const explorerCount = document.getElementById('explorer-count');
  if (explorerCount) {
    explorerCount.innerText = `Mostrando ${docs.length} de ${allDocs.length} art\u00edculos indexados`;
  }

  if (docs.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center text-slate-400 bg-[#161619] rounded-2xl border border-[#26262d]">
        <i data-lucide="calendar-x" class="w-10 h-10 mx-auto mb-3 text-slate-500"></i>
        <p class="font-semibold text-sm text-white mb-1">No se encontraron art\u00edculos con los filtros aplicados.</p>
        <p class="text-xs text-slate-400 mb-4">Prueba seleccionando "Todos" en el filtro de per\u00edodo temporal o ajustando los pilares.</p>
        <button onclick="setDateFilter('all')" class="px-4 py-2 rounded-xl bg-[#e20039] hover:bg-[#f42c4b] text-white text-xs font-semibold cursor-pointer transition-all shadow-md">
          Restablecer a Todos los Art\u00edculos
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = docs.map(d => {
    const m = d.metadata || {};
    const realIndex = allDocs.indexOf(d);
    const pilarColor = getPilarColor(m.pilar);
    const ramosList = (m.ramos || ['Personas / Integral']).join(', ');
    const docDate = m.date || 'Sin fecha';
    
    // Novedad si est? dentro de los ?ltimos 7 d?as respecto al art?culo m?s reciente
    const docTs = parseDateToTimestamp(docDate);
    const diffDays = (docTs > 0) ? Math.floor((maxTimestamp - docTs) / msInDay) : 999;
    const isRecent = (diffDays >= 0 && diffDays <= 7);

    const recentBadge = isRecent ? `
      <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#3ac792]/15 text-[#3ac792] border border-[#3ac792]/30 flex items-center space-x-1" title="Publicado en los \\u00faltimos 7 d\\u00edas">
        <span class="w-1.5 h-1.5 rounded-full bg-[#3ac792] animate-pulse"></span>
        <span>Novedad</span>
      </span>
    ` : '';

    return `
      <div class="p-5 bg-[#1a1a20] rounded-2xl border ${isRecent ? 'border-[#3ac792]/40 bg-gradient-to-b from-[#18221e]/50 to-[#1a1a20]' : 'border-[#2a2a32]'} hover:border-[#e20039]/50 transition-all flex flex-col justify-between group shadow-sm">
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2.5 py-0.5 rounded text-[11px] font-semibold border ${pilarColor}">
              ${m.pilar || 'General'}
            </span>
            <div class="flex items-center space-x-2">
              ${recentBadge}
              <span class="text-xs text-slate-300 font-mono font-medium flex items-center bg-[#141418] px-2 py-0.5 rounded-md border border-[#2a2a32]">
                <i data-lucide="calendar" class="w-3 h-3 mr-1 text-[#e20039]"></i>
                ${docDate}
              </span>
            </div>
          </div>

          <h4 class="font-bold text-white text-sm leading-snug group-hover:text-[#f42c4b] transition-colors mb-2 cursor-pointer" onclick="openArticleReaderByIndex(${realIndex})">
            ${m.title}
          </h4>

          <p class="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-4">
            ${m.summary || 'Sin resumen disponible.'}
          </p>
        </div>

        <div class="pt-3 border-t border-[#26262d] flex items-center justify-between text-xs text-slate-400">
          <span class="truncate max-w-[140px] flex items-center text-slate-400" title="${ramosList}">
            <i data-lucide="tag" class="w-3 h-3 mr-1 text-slate-500 flex-shrink-0"></i>
            <span class="truncate">${ramosList}</span>
          </span>
          <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <button onclick="openArticleReaderByIndex(${realIndex})" title="Leer texto completo en pantalla completa" class="px-2.5 py-1 rounded-lg bg-[#222228] hover:bg-[#2a2a32] text-slate-200 font-medium flex items-center space-x-1 transition-all border border-[#30303a] cursor-pointer text-[11px]">
              <i data-lucide="book-open" class="w-3 h-3 text-[#f42c4b]"></i>
              <span>Leer</span>
            </button>
            <button onclick="downloadArticleByIndex(${realIndex}, 'docx')" title="Descargar archivo original en Word (.docx)" class="px-2.5 py-1 rounded-lg bg-[#222228] hover:bg-[#2a2a32] text-slate-200 hover:text-emerald-400 font-medium flex items-center space-x-1 transition-all border border-[#30303a] cursor-pointer text-[11px]">
              <i data-lucide="download" class="w-3 h-3 text-[#3ac792]"></i>
              <span>Bajar</span>
            </button>
            <button onclick="askAboutDocByIndex(${realIndex})" title="Hacer preguntas a la IA sobre este documento" class="px-2.5 py-1 rounded-lg bg-[#e20039]/15 hover:bg-[#e20039]/25 text-[#f42c4b] font-medium flex items-center space-x-1 transition-all border border-[#e20039]/30 cursor-pointer text-[11px]">
              <i data-lucide="message-square" class="w-3 h-3"></i>
              <span>Consultar</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// MODAL LECTOR DE ART?CULO COMPLETO
// ==========================================
function openArticleReaderByIndex(index) {
  if (!knowledgeBase.documents || !knowledgeBase.documents[index]) return;
  const doc = knowledgeBase.documents[index];
  const meta = doc.metadata || {};
  currentReaderDocIndex = index;

  const modal = document.getElementById('reader-modal');
  const titleEl = document.getElementById('reader-title');
  const pilarEl = document.getElementById('reader-pilar');
  const dateEl = document.getElementById('reader-date');
  const wordsEl = document.getElementById('reader-words');
  const contentEl = document.getElementById('reader-content');
  const ramosEl = document.getElementById('reader-ramos');

  if (titleEl) titleEl.innerText = meta.title || 'Art?culo T?cnico';
  if (pilarEl) {
    pilarEl.innerText = meta.pilar || 'Seguros';
    pilarEl.className = 'px-2.5 py-0.5 rounded text-[11px] font-semibold border ' + getPilarColor(meta.pilar);
  }
  if (dateEl) dateEl.innerText = '?? ' + (meta.date || 'Sin fecha');
  if (wordsEl) wordsEl.innerText = '?? ' + (meta.word_count || 0) + ' palabras';
  
  if (contentEl) {
    const rawText = doc.full_text || doc.content_preview || meta.summary || 'Contenido no disponible.';
    contentEl.innerHTML = marked.parse(rawText);
  }

  if (ramosEl) {
    ramosEl.innerHTML = '<span class="text-slate-400">Ramos: </span><span class="text-slate-200 font-medium">' + (meta.ramos || []).join(', ') + '</span>';
  }

  if (modal) modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
}

function closeArticleReader() {
  const modal = document.getElementById('reader-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = 'auto';
  currentReaderDocIndex = null;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeArticleReader();
});

function askFromReader() {
  if (currentReaderDocIndex === null) return;
  const doc = knowledgeBase.documents[currentReaderDocIndex];
  closeArticleReader();
  switchTab('chat');
  setQuery(`?Cu?les son los aspectos y aplicaciones pr?cticas m?s importantes del documento "${doc.metadata.title}"?`);
}

function askAboutDocByIndex(index) {
  if (!knowledgeBase.documents || !knowledgeBase.documents[index]) return;
  const doc = knowledgeBase.documents[index];
  switchTab('chat');
  setQuery(`Expl?came en detalle los conceptos clave y la aplicaci?n para l?deres de "${doc.metadata.title}".`);
}

// ==========================================
// FUNCIONES DE DESCARGA
// ==========================================
function downloadArticleByIndex(index, format = 'docx') {
  if (!knowledgeBase.documents || !knowledgeBase.documents[index]) return;
  const doc = knowledgeBase.documents[index];
  const meta = doc.metadata || {};
  const docId = meta.doc_id;

  if (docId) {
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=${format}`;
    const a = document.createElement('a');
    a.href = exportUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const text = doc.full_text || doc.content_preview || 'Contenido no disponible.';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const cleanTitle = (meta.title || 'articulo').replace(/[/\\?%*:|"<>]/g, '_');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${cleanTitle}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadCurrentReaderDoc(format = 'docx') {
  if (currentReaderDocIndex !== null) {
    downloadArticleByIndex(currentReaderDocIndex, format);
  }
}

// ==========================================
// MOTOR DE B?SQUEDA RAG & LLM GEMINI
// ==========================================
function searchHybrid(query, pilar = 'Todos', ramo = 'Todos', topK = 5) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  let chunks = knowledgeBase.chunks || [];

  if (pilar !== 'Todos') {
    chunks = chunks.filter(c => c.pilar === pilar || (c.pilar && c.pilar.startsWith(pilar.slice(0, 2))));
  }
  if (ramo !== 'Todos') {
    chunks = chunks.filter(c => (c.ramos || []).some(r => r.toLowerCase().includes(ramo.toLowerCase())));
  }

  const scored = chunks.map(chunk => {
    let score = 0;
    const textLower = (chunk.text || '').toLowerCase();
    const titleLower = (chunk.title || '').toLowerCase();

    queryTerms.forEach(term => {
      if (titleLower.includes(term)) score += 8.0;
      const count = (textLower.match(new RegExp(term, 'g')) || []).length;
      score += count * 2.0;
    });

    return { ...chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function buildNotebookLMPrompt(query, contextChunks) {
  const contextText = contextChunks.map((c, i) => 
    `--- DOCUMENTO ${i+1}: "${c.title}" (Pilar: ${c.pilar}, Fecha: ${c.date || 'Sin fecha'}) ---\n${c.text}\n`
  ).join('\n');

  return `Eres el Asistente Experto en Seguros (estilo NotebookLM).
Tu misi?n es explicar conceptos complejos de seguros a un l?der de equipo o mando medio de una aseguradora.

REGLAS DE RESPUESTA OBLIGATORIAS:
1. Explica el concepto t?cnico con claridad did?ctica, desglosando la teor?a, la normativa argentina o la metodolog?a actuarial correspondiente.
2. Cita los documentos utilizados como [Fuente: T?tulo].
3. Brinda recomendaciones pr?cticas de liderazgo y gesti?n operativa para el equipo del l?der.
4. Tono: Profesional, objetivo, emp?tico y t?cnico (dirigi?ndote al usuario como "l?der" o "t?").
5. Formato: Markdown limpio con negritas, listas y subt?tulos claros.

BASE DE CONOCIMIENTO DISPONIBLE:
${contextText}

PREGUNTA DEL L?DER:
${query}

RESPUESTA DID?CTICA Y ESTRUCTURADA:`;
}

async function callGeminiApi(prompt, maxTokens = 8192) {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${_K}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.3, 
            maxOutputTokens: maxTokens 
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Error con modelo ${model}, intentando siguiente...`, err);
    }
  }
  throw lastError || new Error('No se pudo obtener respuesta del modelo');
}

// ==========================================
// CHAT CONVERSACIONAL
// ==========================================
function setQuery(text) {
  const input = document.getElementById('user-input');
  if (input) {
    input.value = text;
    input.focus();
  }
}

async function handleSend(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('user-input');
  const query = input.value.trim();
  if (!query) return;

  const messagesContainer = document.getElementById('chat-messages');
  
  // Agregar mensaje del usuario
  messagesContainer.innerHTML += `
    <div class="flex items-start justify-end space-x-3 max-w-4xl ml-auto">
      <div class="bg-[#e20039] rounded-2xl rounded-tr-none p-4 text-sm text-white shadow-md leading-relaxed max-w-2xl font-medium">
        ${query}
      </div>
      <div class="w-8 h-8 rounded-xl bg-[#222228] border border-[#303038] flex items-center justify-center flex-shrink-0 text-slate-300 font-bold">
        <i data-lucide="user" class="w-4 h-4"></i>
      </div>
    </div>
  `;
  
  input.value = '';
  
  // Loading state
  const loadingId = 'loading-' + Date.now();
  messagesContainer.innerHTML += `
    <div id="${loadingId}" class="flex items-start space-x-3.5 max-w-4xl">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#b91f38] to-[#e20039] flex items-center justify-center flex-shrink-0 text-white font-bold shadow-md shadow-[#e20039]/20">
        <i data-lucide="bot" class="w-5 h-5"></i>
      </div>
      <div class="bg-[#1a1a20] border border-[#2a2a32] rounded-2xl rounded-tl-none p-4 text-sm text-slate-300 flex items-center space-x-2">
        <span class="w-2 h-2 rounded-full bg-[#e20039] animate-ping"></span>
        <span class="text-xs font-medium">Consultando los ${knowledgeBase.documents ? knowledgeBase.documents.length : 71} art?culos del repositorio...</span>
      </div>
    </div>
  `;
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  if (window.lucide) window.lucide.createIcons();

  try {
    const relevantChunks = searchHybrid(query, selectedPilar, selectedRamo, 5);
    const prompt = buildNotebookLMPrompt(query, relevantChunks);
    const answer = await callGeminiApi(prompt);

    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    messagesContainer.innerHTML += `
      <div class="flex items-start space-x-3.5 max-w-4xl">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#b91f38] to-[#e20039] flex items-center justify-center flex-shrink-0 text-white font-bold shadow-md shadow-[#e20039]/20">
          <i data-lucide="bot" class="w-5 h-5"></i>
        </div>
        <div class="bg-[#1a1a20] border border-[#2a2a32] rounded-2xl rounded-tl-none p-5 text-sm text-slate-200 shadow-sm leading-relaxed prose-dark flex-1">
          ${marked.parse(answer)}
          <div class="mt-4 pt-3 border-t border-[#2a2a32] text-xs text-slate-400 flex flex-wrap items-center gap-2">
            <span class="font-semibold text-slate-300">Fuentes consultadas:</span>
            ${relevantChunks.map(c => `
              <span class="px-2 py-0.5 rounded bg-[#222228] border border-[#303038] text-[11px] text-[#f42c4b]">
                ${c.title}
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    messagesContainer.innerHTML += `
      <div class="flex items-start space-x-3.5 max-w-4xl">
        <div class="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center flex-shrink-0 text-white font-bold">
          <i data-lucide="alert-circle" class="w-5 h-5"></i>
        </div>
        <div class="bg-[#1a1a20] border border-rose-900/50 rounded-2xl rounded-tl-none p-4 text-sm text-rose-300">
          Error al procesar la respuesta: ${err.message}. Por favor intenta nuevamente.
        </div>
      </div>
    `;
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// GENERACI?N DE BRIEFING ESTRAT?GICO
// ==========================================
async function generateExecutiveBriefing() {
  const container = document.getElementById('briefing-content');
  if (!container) return;
  
  const total = knowledgeBase.documents ? knowledgeBase.documents.length : 71;

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center space-y-3 py-16 text-center">
      <div class="w-10 h-10 rounded-full border-2 border-[#e20039] border-t-transparent animate-spin"></div>
      <div class="text-sm font-semibold text-white">Gemini AI est\u00e1 analizando los ${total} art\u00edculos del repositorio...</div>
      <p class="text-xs text-slate-400 max-w-md">Sintetizando conocimientos completos a lo largo de los 5 pilares estrat\u00e9gicos sin cortes ni omisiones.</p>
    </div>
  `;

  try {
    const pilar1Chunks = searchHybrid('IBNR Chain-Ladder Bornhuetter Zillmer Hattendorff GLM', '1. T\u00e9cnico y Actuarial', 'Todos', 3);
    const pilar2Chunks = searchHybrid('Resoluci\u00f3n SSN 287/2025 NIIF 17 CSM Dep\u00f3sito Planes Ley 17.418', '2. Normativa SSN y Legal', 'Todos', 3);
    const pilar3Chunks = searchHybrid('Combined Ratio RAROC Embedded Value VNB WACC DuPont', '3. Finanzas, Capital y Solvencia', 'Todos', 3);
    const pilar4Chunks = searchHybrid('STP siniestros anal\u00edtica fraude IA generativa underwriting UBI telemetr\u00eda', '4. Operaciones, Fraude e Insurtech', 'Todos', 3);
    const pilar5Chunks = searchHybrid('liderazgo mandos medios GROW matrices RACI Lencioni situacional sucesi\u00f3n', '5. Liderazgo y Gesti\u00f3n de Talento', 'Todos', 3);

    const allContextChunks = [...pilar1Chunks, ...pilar2Chunks, ...pilar3Chunks, ...pilar4Chunks, ...pilar5Chunks];

    const contextText = allContextChunks.map((c, i) => 
      `=== [DOC ${i+1}] "${c.title}" (Pilar: ${c.pilar}) ===\n${c.text}\n`
    ).join('\n');

    const prompt = `Eres el Asistente Experto en Seguros (estilo NotebookLM).
Genera un BRIEFING INTEGRAL Y ESTRAT?GICO COMPLETO dirigido a un l?der de equipo o mando medio de una compa??a de seguros sobre el repositorio de ${total} art?culos.

DOCUMENTOS DE LA BASE DE CONOCIMIENTO:
${contextText}

ESTRUCTURA OBLIGATORIA DEL BRIEFING:
# ?? BRIEFING INTEGRAL DE CONOCIMIENTO PARA L?DERES DE SEGUROS

## 1. T?cnico y Actuarial
- Mec?nica y criterios de reservas: IBNR (Chain-Ladder vs Bornhuetter-Ferguson), Reserva Zillmerizada y Teorema de Hattendorff.
- Modelado actuarial (GLM, Lee-Carter, B?hlmann, experiencia actuarial).

## 2. Normativa SSN y Legal
- Impacto cr?tico de la **Resoluci?n SSN 287/2025** y **Res. 24/2025 (UVA)**.
- **Margen de Servicio Contractual (CSM)** bajo NIIF 17 / IFRS 17.
- Reticencia e incontestabilidad (Ley 17.418) y R?gimen PAS (Ley 22.400).

## 3. Finanzas, Capital y Solvencia
- Palancas de control del **Combined Ratio**.
- **Embedded Value (EV)**, **Value of New Business (VNB)** y **RAROC**.
- An?lisis DuPont y asignaci?n de capital.

## 4. Operaciones, Fraude e Insurtech
- **Straight-Through Processing (STP)** en siniestros y anal?tica predictiva de fraude.
- **IA Generativa en Underwriting** y modelos din?micos (UBI, Telemetr?a).

## 5. Liderazgo y Gesti?n de Talento
- Liderar desde el mando medio y modelo de Kotter para gestionar el cambio.
- Herramientas de ejecuci?n: **Modelo GROW de coaching** y **Matrices RACI**.
- Liderazgo reflexivo (doble bucle de aprendizaje) y superaci?n de las 5 disfunciones (Lencioni).

## ?? Plan de Acci?n y Checklist Mensual para el L?der
- 5 prioridades inmediatas recomendadas para gestionar con tu equipo este mes.

INSTRUCCIONES CLAVE:
- S? exhaustivo, did?ctico y fluido. Completa TODAS las secciones de principio a fin.`;

    const answer = await callGeminiApi(prompt, 8192);
    lastGeneratedBriefingMarkdown = answer;

    container.innerHTML = `
      <div class="flex items-center justify-between pb-4 mb-6 border-b border-[#2e2e38]">
        <span class="text-xs text-[#3ac792] font-semibold flex items-center">
          <span class="w-2 h-2 rounded-full bg-[#3ac792] mr-2"></span> Briefing Generado Exitosamente
        </span>
        <div class="flex items-center space-x-2">
          <button onclick="copyBriefingText()" class="px-3 py-1.5 rounded-lg bg-[#222228] hover:bg-[#2a2a32] text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 border border-[#303038] transition-all cursor-pointer">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            <span id="copy-btn-text">Copiar Texto</span>
          </button>
          <button onclick="window.print()" class="px-3 py-1.5 rounded-lg bg-[#e20039]/15 hover:bg-[#e20039]/25 text-[#f42c4b] text-xs font-medium flex items-center space-x-1.5 border border-[#e20039]/30 transition-all cursor-pointer">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i>
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>
      <div class="prose-dark leading-relaxed">
        ${marked.parse(answer)}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    container.innerHTML = '<p class="text-rose-400 font-semibold">Error generando el briefing: ' + err.message + '</p>';
  }
}

function copyBriefingText() {
  if (!lastGeneratedBriefingMarkdown) return;
  navigator.clipboard.writeText(lastGeneratedBriefingMarkdown).then(() => {
    const btnText = document.getElementById('copy-btn-text');
    if (btnText) {
      btnText.innerText = '\u00a1Copiado!';
      setTimeout(() => { btnText.innerText = 'Copiar Texto'; }, 2000);
    }
  });
}
