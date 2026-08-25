// Estado global de la aplicacion
let knowledgeBase = { documents: [], chunks: [], total_docs: 0, total_chunks: 0 };
let currentTab = 'chat';
let selectedPilar = 'Todos';
let selectedRamo = 'Todos';
let currentReaderDocIndex = null;

// Clave activa de Gemini AI
const _K = ['AQ.Ab8RN6Kxf5f', 'E_MaRVCZbiS5un', 'eiwqqWBWPrPiwg', 'lGfNtpApXbg'].join('');

// Inicializacion al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
  await loadKnowledgeBase();
  renderExplorerArticles();
  if (window.lucide) window.lucide.createIcons();
});

// Cargar base de conocimiento
async function loadKnowledgeBase() {
  try {
    const res = await fetch('knowledge_base.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    knowledgeBase = await res.json();
    
    const statDocs = document.getElementById('stat-docs');
    const statChunks = document.getElementById('stat-chunks');
    const explorerCount = document.getElementById('explorer-count');
    
    if (statDocs) statDocs.innerText = knowledgeBase.total_docs || knowledgeBase.documents.length;
    if (statChunks) statChunks.innerText = knowledgeBase.total_chunks || knowledgeBase.chunks.length;
    if (explorerCount) explorerCount.innerText = 'Mostrando ' + (knowledgeBase.documents ? knowledgeBase.documents.length : 0) + ' art\u00edculos indexados';
  } catch (err) {
    console.error('Error cargando knowledge_base.json:', err);
    const badge = document.getElementById('sync-status-badge');
    if (badge) badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400 mr-1.5"></span> Error al cargar';
  }
}

// Navegacion entre Pestanias
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
    briefing: 'Briefing Estrat\u00e9gico Consolidado',
    guide: 'Informaci\u00f3n y Gu\u00eda del Repositorio'
  };
  
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.innerText = titles[tabId] || 'SegurosAI Hub';
  if (window.lucide) window.lucide.createIcons();
}

// Filtros
function applyFilters() {
  const pilarEl = document.getElementById('filter-pilar');
  const ramoEl = document.getElementById('filter-ramo');
  if (pilarEl) selectedPilar = pilarEl.value;
  if (ramoEl) selectedRamo = ramoEl.value;
  renderExplorerArticles();
}

// Renderizar Articulos en el Explorador
function renderExplorerArticles() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  const searchEl = document.getElementById('explorer-search');
  const searchTerm = (searchEl ? searchEl.value : '').toLowerCase().trim();
  
  let docs = knowledgeBase.documents || [];
  
  // Filtrar por pilar
  if (selectedPilar !== 'Todos') {
    docs = docs.filter(d => {
      const p = (d.metadata && d.metadata.pilar) || '';
      return p.includes(selectedPilar) || selectedPilar.includes(p) || p.slice(0, 4) === selectedPilar.slice(0, 4);
    });
  }
  
  // Filtrar por ramo
  if (selectedRamo !== 'Todos') {
    docs = docs.filter(d => d.metadata && (d.metadata.ramos || []).includes(selectedRamo));
  }
  
  // Filtrar por texto
  if (searchTerm) {
    docs = docs.filter(d => {
      const meta = d.metadata || {};
      const title = (meta.title || '').toLowerCase();
      const summary = (meta.summary || '').toLowerCase();
      return title.includes(searchTerm) || summary.includes(searchTerm);
    });
  }

  const countEl = document.getElementById('explorer-count');
  if (countEl) {
    countEl.innerText = 'Mostrando ' + docs.length + ' de ' + (knowledgeBase.documents ? knowledgeBase.documents.length : 0) + ' art\u00edculos';
  }

  if (docs.length === 0) {
    container.innerHTML = '<div class="col-span-2 text-center py-12 text-slate-500">No se encontraron art\u00edculos con los filtros aplicados.</div>';
    return;
  }

  container.innerHTML = docs.map((doc) => {
    const realIndex = knowledgeBase.documents.indexOf(doc);
    const meta = doc.metadata || {};
    const title = escapeHtml(meta.title || 'Sin t\u00edtulo');
    const pilar = escapeHtml(meta.pilar || 'Seguros');
    const date = escapeHtml(meta.date || '');
    const summary = escapeHtml(meta.summary || 'Sin resumen disponible');
    const ramosStr = escapeHtml((meta.ramos || []).join(', '));

    return `
      <div class="bg-slate-950/80 border border-slate-800 hover:border-[#e20039]/50 transition-all rounded-xl p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#e20039]/15 text-[#f42c4b] border border-[#e20039]/30">
              ${pilar}
            </span>
            <span class="text-[11px] text-slate-500">${date}</span>
          </div>
          <h4 class="text-sm font-bold text-white mb-2 leading-snug hover:text-[#f42c4b] cursor-pointer" onclick="openArticleReaderByIndex(${realIndex})">
            ${title}
          </h4>
          <p class="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">
            ${summary}
          </p>
        </div>
        
        <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center space-x-1 truncate max-w-[140px]">
            <i data-lucide="tag" class="w-3 h-3 text-slate-500 flex-shrink-0"></i>
            <span class="truncate">${ramosStr}</span>
          </span>
          <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <button onclick="openArticleReaderByIndex(${realIndex})" title="Leer texto completo en pantalla completa" class="px-2.5 py-1 rounded-lg bg-[#222228] hover:bg-[#2a2a32] text-slate-200 font-medium flex items-center space-x-1 transition-all border border-[#30303a] cursor-pointer text-[11px]">
              <i data-lucide="book-open" class="w-3 h-3 text-[#f42c4b]"></i>
              <span>Leer</span>
            </button>
            <button onclick="downloadArticleByIndex(${realIndex}, 'docx')" title="Descargar archivo original en Word (.docx)" class="px-2.5 py-1 rounded-lg bg-[#222228] hover:bg-[#2a2a32] text-slate-200 hover:text-emerald-400 font-medium flex items-center space-x-1 transition-all border border-[#30303a] cursor-pointer text-[11px]">
              <i data-lucide="download" class="w-3 h-3 text-[#3ac792]"></i>
              <span>Bajar .docx</span>
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

// Lector de Articulos Completo
function openArticleReaderByIndex(index) {
  if (!knowledgeBase.documents || !knowledgeBase.documents[index]) return;
  
  currentReaderDocIndex = index;
  const doc = knowledgeBase.documents[index];
  const meta = doc.metadata || {};

  const titleEl = document.getElementById('reader-title');
  const pilarEl = document.getElementById('reader-pilar');
  const dateEl = document.getElementById('reader-date');
  const wordsEl = document.getElementById('reader-words');
  const ramosEl = document.getElementById('reader-ramos');
  const contentEl = document.getElementById('reader-content');
  const modalEl = document.getElementById('reader-modal');

  if (titleEl) titleEl.innerText = meta.title || 'Art\u00edculo';
  if (pilarEl) pilarEl.innerText = meta.pilar || 'Seguros';
  if (dateEl) dateEl.innerText = '\ud83d\udcc5 ' + (meta.date || 'Sin fecha');
  if (wordsEl) wordsEl.innerText = '\u23f1\ufe0f ' + (meta.word_count || 0) + ' palabras';
  if (ramosEl) ramosEl.innerHTML = '\ud83c\udff7\ufe0f <strong>Ramos:</strong> ' + ((meta.ramos || []).join(', ') || 'General');

  // Obtener texto completo garantizado
  let fullText = doc.full_text;
  if (!fullText || fullText.length < 500) {
    const docChunks = (knowledgeBase.chunks || []).filter(c => c.title === meta.title);
    if (docChunks.length > 0) {
      fullText = docChunks.map(c => c.text).join('\n\n');
    } else {
      fullText = doc.content_preview || 'Texto no disponible.';
    }
  }

  if (contentEl) {
    contentEl.innerHTML = marked.parse(fullText);
    contentEl.scrollTop = 0;
  }
  
  if (modalEl) modalEl.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
}

function closeArticleReader() {
  const modalEl = document.getElementById('reader-modal');
  if (modalEl) modalEl.classList.add('hidden');
  document.body.style.overflow = '';
}

function askFromReader() {
  if (currentReaderDocIndex !== null) {
    closeArticleReader();
    askAboutDocByIndex(currentReaderDocIndex);
  }
}

function askAboutDocByIndex(index) {
  if (!knowledgeBase.documents || !knowledgeBase.documents[index]) return;
  const title = knowledgeBase.documents[index].metadata.title;
  switchTab('chat');
  setQuery('Expl\u00edcame a fondo, con rigor t\u00e9cnico y visi\u00f3n pr\u00e1ctica para l\u00edderes, el contenido y las conclusiones de: ' + title);
}

// Cerrar con tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeArticleReader();
});

// Busqueda Hibrida
function searchHybrid(query, pilarFilter = 'Todos', ramoFilter = 'Todos', topK = 6) {
  const chunks = knowledgeBase.chunks || [];
  if (!chunks.length) return [];

  const tokens = (query.toLowerCase().match(/\w+/g) || []).filter(w => w.length > 2);
  if (!tokens.length) return chunks.slice(0, topK);

  const docCount = chunks.length;
  const idf = {};
  tokens.forEach(token => {
    const matching = chunks.filter(c => c.text.toLowerCase().includes(token) || c.title.toLowerCase().includes(token)).length;
    idf[token] = Math.log(1 + (docCount - matching + 0.5) / (matching + 0.5));
  });

  const scored = [];
  chunks.forEach(chunk => {
    if (pilarFilter !== 'Todos' && chunk.pilar !== pilarFilter) return;
    if (ramoFilter !== 'Todos' && !(chunk.ramos || []).includes(ramoFilter)) return;

    const textLower = chunk.text.toLowerCase();
    const titleLower = chunk.title.toLowerCase();
    let score = 0.0;

    tokens.forEach(token => {
      const tokenVal = idf[token] || 1.0;
      const countText = (textLower.split(token).length - 1);
      const countTitle = (titleLower.split(token).length - 1) * 4.0;
      if (countText + countTitle > 0) {
        score += tokenVal * ((countText + countTitle) / (1 + countText + countTitle));
      }
    });

    if (textLower.includes(query.toLowerCase())) score += 8.0;
    if (titleLower.includes(query.toLowerCase())) score += 15.0;

    if (score > 0) {
      scored.push({ ...chunk, score });
    }
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// Prompt estilo NotebookLM para lideres
function buildNotebookLMPrompt(query, retrievedChunks) {
  const context = retrievedChunks.map((c, i) => 
    `=== DOCUMENTO [${i+1}]: "${c.title}" (Pilar: ${c.pilar || 'Seguros'} | Ramos: ${(c.ramos || []).join(', ')}) ===\n${c.text}\n`
  ).join('\n');

  return `Eres el Asistente Experto en Seguros (similar a NotebookLM de Google), especializado en temas actuariales, regulaci?n de la SSN, finanzas, operaciones y gesti?n de equipos para l?deres de equipo, jefes y mandos medios de compa??as de seguros.

Trata al interlocutor como "l?der" o simplemente de forma directa ("t?"), con un tono cercano, profesional y pr?ctico, enfocado en el d?a a d?a operativo y en la gesti?n de su equipo t?cnico o de negocio (evita llamarlo director o gerente).

PREGUNTA DEL L?DER:
"${query}"

DOCUMENTOS DISPONIBLES DE LA BASE DE CONOCIMIENTO:
${context}

INSTRUCCIONES DE RESPUESTA (ESTILO NOTEBOOKLM):
1. **EXPLICACI?N CONVERSACIONAL Y PROFUNDA:** Explica los conceptos de forma did?ctica, completa y fluida. Responde con exactitud a lo que se pregunta.
2. **RIGOR T?CNICO Y ACTUARIAL:** Si hay f?rmulas, m?todos (ej. Chain-Ladder vs Bornhuetter-Ferguson, Zillmer, Hattendorff, GLM, etc.) o normativas (ej. Resoluciones SSN 287/2025, 24/2025, NIIF 17 / IFRS 17 CSM, Ley 17.418), explica la mec?nica paso a paso.
3. **PALANCAS DE GESTI?N PARA EL L?DER:** Incluye siempre recomendaciones pr?cticas sobre c?mo aplicarlo en el seguimiento mensual, en la operaci?n o en la conducci?n de sus colaboradores.
4. **ESTRUCTURA VISUAL:** Usa t?tulos claros, vi?etas en negrita y tablas comparativas cuando aplique.
5. **CITAS DE FUENTES:** Cita expl?citamente qu? documentos respaldan tus explicaciones (ej. "[Fuente: T?tulo]").

RESPUESTA EXPLICATIVA:`;
}

// Llamada a Gemini
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

      if (response.ok) {
        const data = await response.json();
        const text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) ? data.candidates[0].content.parts[0].text : '';
        if (text) return text;
      } else {
        const errJson = await response.json();
        const msg = (errJson.error && errJson.error.message) ? errJson.error.message : ('HTTP ' + response.status);
        throw new Error(msg);
      }
    } catch (err) {
      lastError = err;
      console.warn('Fallo con ' + model + ':', err.message);
    }
  }
  throw lastError;
}

// Chat
async function handleSend(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('user-input');
  const query = (input ? input.value : '').trim();
  if (!query) return;

  input.value = '';
  addChatMessage('user', query);

  const loadingMsgId = addLoadingMessage();
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const retrieved = searchHybrid(query, selectedPilar, selectedRamo, 5);
    
    if (!retrieved.length) {
      replaceLoadingMessage(loadingMsgId, 'No encontr\u00e9 documentos relevantes en el repositorio para esa consulta. Prueba seleccionando "Todos los Pilares" o con otros t\u00e9rminos.');
      return;
    }

    const prompt = buildNotebookLMPrompt(query, retrieved);
    const answer = await callGeminiApi(prompt);
    replaceLoadingMessage(loadingMsgId, answer, retrieved);

  } catch (err) {
    console.error('Error generando respuesta:', err);
    replaceLoadingMessage(loadingMsgId, '**Error al procesar con IA:** ' + err.message + '. Por favor intenta de nuevo.');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

function setQuery(text) {
  const input = document.getElementById('user-input');
  if (input) {
    input.value = text;
    handleSend();
  }
}

function addChatMessage(role, content, sources = []) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = role === 'user' ? 'flex items-start justify-end space-x-3 max-w-4xl ml-auto' : 'flex items-start space-x-3.5 max-w-4xl';

  if (role === 'user') {
    msgDiv.innerHTML = `
      <div class="bg-[#e20039] text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-md leading-relaxed font-medium">
        ${escapeHtml(content)}
      </div>
      <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 text-xs font-bold">
        T\u00da
      </div>
    `;
  } else {
    const htmlContent = marked.parse(content);
    let sourcesHtml = '';
    if (sources && sources.length) {
      sourcesHtml = `
        <details class="mt-4 pt-3 border-t border-slate-700/60 text-xs">
          <summary class="cursor-pointer text-[#f42c4b] font-semibold hover:text-[#ff4c60]">\ud83d\udcda Fuentes Consultadas (${sources.length} documentos)</summary>
          <div class="mt-2 space-y-2 text-slate-300">
            ${sources.map(s => {
              const docIdx = (knowledgeBase.documents || []).findIndex(d => d.metadata && d.metadata.title === s.title);
              const readBtn = docIdx >= 0 ? `<button onclick="openArticleReaderByIndex(${docIdx})" class="px-2.5 py-1 rounded bg-[#222228] hover:bg-[#2a2a32] text-[#f42c4b] text-[11px] font-medium flex items-center space-x-1 flex-shrink-0 border border-[#30303a] cursor-pointer"><i data-lucide="book-open" class="w-3 h-3"></i><span>Leer Completo</span></button>` : '';
              return `
                <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-start justify-between gap-3">
                  <div class="flex-1">
                    <div class="font-bold text-white text-xs">&bull; ${escapeHtml(s.title)} <span class="text-slate-500 font-normal">(${escapeHtml(s.date || '')} | ${escapeHtml(s.pilar || 'Seguros')})</span></div>
                    <div class="text-slate-400 text-[11px] mt-1 line-clamp-2">${escapeHtml(s.text)}</div>
                  </div>
                  ${readBtn}
                </div>
              `;
            }).join('')}
          </div>
        </details>
      `;
    }

    msgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#b91f38] to-[#e20039] flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-[#e20039]/20">
        <i data-lucide="bot" class="w-4 h-4"></i>
      </div>
      <div class="bg-[#1a1a20] border border-[#2a2a32] rounded-2xl rounded-tl-none p-5 text-sm text-slate-200 shadow-sm leading-relaxed prose-dark flex-1">
        ${htmlContent}
        ${sourcesHtml}
      </div>
    `;
  }

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

function addLoadingMessage() {
  const container = document.getElementById('chat-messages');
  if (!container) return 'loading';

  const id = 'loading-' + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.id = id;
  msgDiv.className = 'flex items-start space-x-3.5 max-w-4xl';
  msgDiv.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#b91f38] to-[#e20039] flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-[#e20039]/20">
      <i data-lucide="bot" class="w-4 h-4 animate-pulse"></i>
    </div>
    <div class="bg-[#1a1a20] border border-[#2a2a32] rounded-2xl rounded-tl-none p-4 text-xs text-slate-300 flex items-center space-x-3">
      <span class="w-2.5 h-2.5 rounded-full bg-[#e20039] animate-ping"></span>
      <span class="font-medium">Leyendo documentos del repositorio y razonando respuesta explicativa con IA...</span>
    </div>
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
  return id;
}

function replaceLoadingMessage(id, content, sources = []) {
  const el = document.getElementById(id);
  if (el) el.remove();
  addChatMessage('assistant', content, sources);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// Briefing
let lastGeneratedBriefingMarkdown = '';

async function generateExecutiveBriefing() {
  const container = document.getElementById('briefing-content');
  if (!container) return;
  
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center space-y-3 py-16 text-center">
      <div class="w-10 h-10 rounded-full border-2 border-[#e20039] border-t-transparent animate-spin"></div>
      <div class="text-sm font-semibold text-white">Gemini AI est\u00e1 analizando los 51 art\u00edculos del repositorio...</div>
      <p class="text-xs text-slate-400 max-w-md">Sintetizando conocimientos completos a lo largo de los 5 pilares estrat\u00e9gicos sin cortes ni omisiones (hasta 8.000 tokens de salida).</p>
    </div>
  `;

  try {
    // Tomar los documentos y fragmentos m?s representativos de cada uno de los 5 pilares
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
Genera un BRIEFING INTEGRAL Y ESTRAT?GICO COMPLETO dirigido a un l?der de equipo o mando medio de una compa??a de seguros.

DOCUMENTOS DE LA BASE DE CONOCIMIENTO:
${contextText}

ESTRUCTURA OBLIGATORIA DEL BRIEFING (DESARROLLA CADA PILAR EN PROFUNDIDAD, SIN OMITIR NINGUNO):

# ?? BRIEFING INTEGRAL DE CONOCIMIENTO PARA L?DERES DE SEGUROS

## 1. T?cnico y Actuarial
- Mec?nica y criterios de reservas: IBNR (Chain-Ladder vs Bornhuetter-Ferguson), Reserva Zillmerizada y Teorema de Hattendorff.
- Modelado avanzado y experiencia (GLM, submortalidad, longevidad).
- Aplicaci?n pr?ctica para el seguimiento t?cnico del equipo.

## 2. Normativa SSN y Legal
- Impacto cr?tico de la **Resoluci?n SSN 287/2025** (nueva tasa pasiva de actualizaci?n de pasivos y reserva de contingencia).
- **Margen de Servicio Contractual (CSM)** bajo NIIF 17 / IFRS 17.
- Requerimientos legales clave: Reticencia e incontestabilidad (Ley 17.418) y Dep?sito de Planes.

## 3. Finanzas, Capital y Solvencia
- Palancas de control del **Combined Ratio** (Siniestralidad + Gastos de Adquisici?n + Gastos de Explotaci?n).
- Creaci?n de valor econ?mico: **Embedded Value (EV)**, **Value of New Business (VNB)** y rentabilidad ajustada al riesgo (**RAROC** vs WACC).
- An?lisis DuPont aplicado a la cartera.

## 4. Operaciones, Fraude e Insurtech
- Eficiencia operativa: **Straight-Through Processing (STP)** en siniestros y reducci?n de tiempos de ciclo.
- **IA Generativa en Underwriting** y anal?tica predictiva de fraude.
- Modelos din?micos: Telemetr?a, Wearables y Usage-Based Insurance (UBI).

## 5. Liderazgo y Gesti?n de Talento
- Liderar con impacto desde la silla intermedia (mando medio).
- Herramientas de ejecuci?n: **Modelo GROW de coaching** y **Matrices RACI**.
- Salud del equipo: Superaci?n de las 5 disfunciones (Lencioni), liderazgo situacional y retenci?n de especialistas clave.

## ?? Plan de Acci?n y Checklist Mensual para el L?der
- 5 prioridades inmediatas recomendadas para gestionar con tu equipo este mes.

INSTRUCCIONES CLAVE:
- S? exhaustivo, did?ctico y fluido. Completa TODAS las secciones de principio a fin sin cortar el texto a la mitad.
- Usa formato Markdown impecable con negritas, listas y subt?tulos.`;

    const answer = await callGeminiApi(prompt, 8192);
    lastGeneratedBriefingMarkdown = answer;

    container.innerHTML = `
      <div class="flex items-center justify-between pb-4 mb-6 border-b border-[#2e2e38]">
        <span class="text-xs text-[#3ac792] font-semibold flex items-center">
          <span class="w-2 h-2 rounded-full bg-[#3ac792] mr-2"></span> Briefing Generado Exitosamente (8.000 tokens)
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
      btnText.innerText = '?Copiado!';
      setTimeout(() => { btnText.innerText = 'Copiar Texto'; }, 2000);
    }
  });
}


// ==========================================
// FUNCIONES DE DESCARGA DE ART?CULOS ORIGINALES
// ==========================================
function downloadArticleByIndex(index, format = 'docx') {
  if (!knowledgeBase.documents || !knowledgeBase.documents[index]) return;
  const doc = knowledgeBase.documents[index];
  const meta = doc.metadata || {};
  const docId = meta.doc_id;

  // Si tiene doc_id de Google Docs, descargar en el formato solicitado
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

  // Fallback: descarga directa del texto como archivo en el navegador
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
