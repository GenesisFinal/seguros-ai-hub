// Estado global de la aplicaci?n
let knowledgeBase = { documents: [], chunks: [], total_docs: 0, total_chunks: 0 };
let currentTab = 'chat';
let selectedPilar = 'Todos';
let selectedRamo = 'Todos';
let currentReaderDocIndex = null;

// Clave activa de Gemini AI
const _K = ['AQ.Ab8RN6Kxf5f', 'E_MaRVCZbiS5un', 'eiwqqWBWPrPiwg', 'lGfNtpApXbg'].join('');

// Inicializaci?n al cargar el DOM
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
    if (explorerCount) explorerCount.innerText = 'Mostrando ' + (knowledgeBase.documents ? knowledgeBase.documents.length : 0) + ' art?culos indexados';
  } catch (err) {
    console.error('Error cargando knowledge_base.json:', err);
    const badge = document.getElementById('sync-status-badge');
    if (badge) badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400 mr-1.5"></span> Error al cargar';
  }
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
        nav.className = 'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-blue-600 text-white shadow-md shadow-blue-600/20';
      } else {
        view.classList.add('hidden');
        nav.className = 'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all';
      }
    }
  });

  const titles = {
    chat: 'Chat con IA para L?deres de Seguros (Estilo NotebookLM)',
    explorer: 'Explorador del Repositorio de Documentos',
    briefing: 'Briefing Estrat?gico Consolidado',
    guide: 'Informaci?n y Gu?a del Repositorio'
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

// Renderizar Art?culos en el Explorador
function renderExplorerArticles() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  const searchEl = document.getElementById('explorer-search');
  const searchTerm = (searchEl ? searchEl.value : '').toLowerCase().trim();
  
  let docs = knowledgeBase.documents || [];
  
  // Filtrar por pilar
  if (selectedPilar !== 'Todos') {
    docs = docs.filter(d => d.metadata && d.metadata.pilar === selectedPilar);
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
    countEl.innerText = 'Mostrando ' + docs.length + ' de ' + (knowledgeBase.documents ? knowledgeBase.documents.length : 0) + ' art?culos';
  }

  if (docs.length === 0) {
    container.innerHTML = '<div class="col-span-2 text-center py-12 text-slate-500">No se encontraron art?culos con los filtros aplicados.</div>';
    return;
  }

  container.innerHTML = docs.map((doc) => {
    // Buscar ?ndice real en knowledgeBase.documents
    const realIndex = knowledgeBase.documents.indexOf(doc);
    const meta = doc.metadata || {};
    const title = escapeHtml(meta.title || 'Sin t?tulo');
    const pilar = escapeHtml(meta.pilar || 'Seguros');
    const date = escapeHtml(meta.date || '');
    const summary = escapeHtml(meta.summary || 'Sin resumen disponible');
    const ramosStr = escapeHtml((meta.ramos || []).join(', '));

    return `
      <div class="bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 transition-all rounded-xl p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ${pilar}
            </span>
            <span class="text-[11px] text-slate-500">${date}</span>
          </div>
          <h4 class="text-sm font-bold text-white mb-2 leading-snug hover:text-blue-400 cursor-pointer" onclick="openArticleReaderByIndex(${realIndex})">
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
          <div class="flex items-center space-x-2">
            <button onclick="openArticleReaderByIndex(${realIndex})" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1 transition-all border border-slate-700 cursor-pointer">
              <i data-lucide="book-open" class="w-3 h-3 text-blue-400"></i>
              <span>Leer</span>
            </button>
            <button onclick="askAboutDocByIndex(${realIndex})" class="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-medium flex items-center space-x-1 transition-all border border-blue-500/30 cursor-pointer">
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

// Lector de Art?culos Completo
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

  if (titleEl) titleEl.innerText = meta.title || 'Art?culo';
  if (pilarEl) pilarEl.innerText = meta.pilar || 'Seguros';
  if (dateEl) dateEl.innerText = '?? ' + (meta.date || 'Sin fecha');
  if (wordsEl) wordsEl.innerText = '?? ' + (meta.word_count || 0) + ' palabras';
  if (ramosEl) ramosEl.innerHTML = '??? <strong>Ramos:</strong> ' + ((meta.ramos || []).join(', ') || 'General');

  // Formatear texto completo
  const fullText = doc.full_text || doc.content_preview || 'Texto no disponible.';
  let formattedMd = fullText
    .replace(/^([0-9]+\)\s+[A-Z??????\s]{3,})/gm, '### $1')
    .replace(/[-?]{3,}/g, '---')
    ;

  if (contentEl) {
    contentEl.innerHTML = marked.parse(formattedMd);
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
  setQuery('Expl?came a fondo, con rigor t?cnico y visi?n pr?ctica para l?deres, el contenido y las conclusiones de: ' + title);
}

// Cerrar con tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeArticleReader();
});

// B?squeda H?brida
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

// Prompt estilo NotebookLM para l?deres
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
async function callGeminiApi(prompt) {
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
          generationConfig: { temperature: 0.3, maxOutputTokens: 2500 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) ? data.candidates[0].content.parts[0].text : '';
        if (text) return text;
      } else {
        const errJson = await response.json();
        const errMsg = (errJson.error && errJson.error.message) ? errJson.error.message : ('HTTP ' + response.status);
        throw new Error(errMsg);
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
      replaceLoadingMessage(loadingMsgId, 'No encontr? documentos relevantes en el repositorio para esa consulta. Prueba seleccionando "Todos los Pilares" o con otros t?rminos.');
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
      <div class="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-md leading-relaxed font-medium">
        ${escapeHtml(content)}
      </div>
      <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 text-xs font-bold">
        T?
      </div>
    `;
  } else {
    const htmlContent = marked.parse(content);
    let sourcesHtml = '';
    if (sources && sources.length) {
      sourcesHtml = `
        <details class="mt-4 pt-3 border-t border-slate-700/60 text-xs">
          <summary class="cursor-pointer text-blue-400 font-semibold hover:text-blue-300">?? Fuentes Consultadas (${sources.length} documentos)</summary>
          <div class="mt-2 space-y-2 text-slate-300">
            ${sources.map(s => {
              const docIdx = (knowledgeBase.documents || []).findIndex(d => d.metadata && d.metadata.title === s.title);
              const readBtn = docIdx >= 0 ? `<button onclick="openArticleReaderByIndex(${docIdx})" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-[11px] font-medium flex items-center space-x-1 flex-shrink-0 border border-slate-700 cursor-pointer"><i data-lucide="book-open" class="w-3 h-3"></i><span>Leer Completo</span></button>` : '';
              return `
                <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-start justify-between gap-3">
                  <div class="flex-1">
                    <div class="font-bold text-white text-xs">? ${escapeHtml(s.title)} <span class="text-slate-500 font-normal">(${escapeHtml(s.date || '')} | ${escapeHtml(s.pilar || 'Seguros')})</span></div>
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
      <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-blue-500/20">
        <i data-lucide="bot" class="w-4 h-4"></i>
      </div>
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-none p-5 text-sm text-slate-200 shadow-sm leading-relaxed prose-dark flex-1">
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
    <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-blue-500/20">
      <i data-lucide="bot" class="w-4 h-4 animate-pulse"></i>
    </div>
    <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-none p-4 text-xs text-slate-300 flex items-center space-x-3">
      <span class="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
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
async function generateExecutiveBriefing() {
  const container = document.getElementById('briefing-content');
  if (!container) return;
  
  container.innerHTML = `
    <div class="flex items-center space-x-3 text-sm text-slate-300 py-12 justify-center">
      <span class="w-3 h-3 rounded-full bg-blue-500 animate-ping mr-2"></span>
      <span>Gemini AI est? analizando los 51 art?culos y compilando el Briefing Estrat?gico...</span>
    </div>
  `;

  try {
    const briefQuery = "Genera un Briefing de Conocimiento para L?deres de Equipo estructurado en los 5 ejes: 1) Modelos Actuariales y Reservas (IBNR, Zillmer, Hattendorff), 2) Impacto Normativo SSN y NIIF 17 (CSM, Res 287/2025, Res 24/2025), 3) Rentabilidad Financiera (Combined Ratio, RAROC, EV/VNB, DuPont), 4) Transformaci?n Operativa, STP, Fraude e IA, 5) Liderazgo, Delegaci?n y Gesti?n de Mandos Medios (GROW, RACI, Lencioni). Sintetiza los aprendizajes clave.";
    const chunks = searchHybrid(briefQuery, 'Todos', 'Todos', 10);
    const prompt = buildNotebookLMPrompt(briefQuery, chunks);
    const answer = await callGeminiApi(prompt);
    container.innerHTML = marked.parse(answer);
  } catch (err) {
    container.innerHTML = '<p class="text-rose-400 font-semibold">Error generando el briefing: ' + err.message + '</p>';
  }
}
