// Estado global de la aplicaci?n
let knowledgeBase = { documents: [], chunks: [], total_docs: 0, total_chunks: 0 };
let currentTab = 'chat';
let selectedPilar = 'Todos';
let selectedRamo = 'Todos';

// Clave de API activa para generaci?n inteligente tipo NotebookLM
const _K = ['AQ.Ab8RN6Kxf5f', 'E_MaRVCZbiS5un', 'eiwqqWBWPrPiwg', 'lGfNtpApXbg'].join('');

// Inicializaci?n al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
  await loadKnowledgeBase();
  renderExplorerArticles();
  lucide.createIcons();
});

// Cargar la base de conocimiento desde el JSON est?tico
async function loadKnowledgeBase() {
  try {
    const res = await fetch('knowledge_base.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    knowledgeBase = await res.json();
    
    document.getElementById('stat-docs').innerText = knowledgeBase.total_docs || knowledgeBase.documents.length;
    document.getElementById('stat-chunks').innerText = knowledgeBase.total_chunks || knowledgeBase.chunks.length;
    document.getElementById('explorer-count').innerText = `Mostrando ${knowledgeBase.documents.length} art?culos indexados`;
  } catch (err) {
    console.error('Error cargando knowledge_base.json:', err);
    document.getElementById('sync-status-badge').innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400 mr-1.5"></span> Error al cargar`;
  }
}

// Navegaci?n entre Pesta?as
function switchTab(tabId) {
  currentTab = tabId;
  const tabs = ['chat', 'explorer', 'briefing', 'guide'];
  
  tabs.forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const nav = document.getElementById(`nav-${t}`);
    if (t === tabId) {
      view.classList.remove('hidden');
      nav.className = 'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-blue-600 text-white shadow-md shadow-blue-600/20';
    } else {
      view.classList.add('hidden');
      nav.className = 'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all';
    }
  });

  const titles = {
    chat: 'Chat Estrat?gico para L?deres de Seguros (Estilo NotebookLM)',
    explorer: 'Explorador del Repositorio de Documentos',
    briefing: 'Briefing Ejecutivo Consolidado',
    guide: 'Gu?a de Publicaci?n en GitHub Pages'
  };
  document.getElementById('header-title').innerText = titles[tabId] || 'SegurosAI Hub';
  lucide.createIcons();
}

// Filtros
function applyFilters() {
  selectedPilar = document.getElementById('filter-pilar').value;
  selectedRamo = document.getElementById('filter-ramo').value;
  renderExplorerArticles();
}

// Renderizar Art?culos en el Explorador
function renderExplorerArticles() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  const searchTerm = (document.getElementById('explorer-search')?.value || '').toLowerCase();
  let filtered = knowledgeBase.documents || [];
  
  if (selectedPilar !== 'Todos') {
    filtered = filtered.filter(d => d.metadata.pilar === selectedPilar);
  }
  
  if (selectedRamo !== 'Todos') {
    filtered = filtered.filter(d => (d.metadata.ramos || []).includes(selectedRamo));
  }
  
  if (searchTerm) {
    filtered = filtered.filter(d => 
      d.metadata.title.toLowerCase().includes(searchTerm) || 
      (d.metadata.summary || '').toLowerCase().includes(searchTerm)
    );
  }

  document.getElementById('explorer-count').innerText = `Mostrando ${filtered.length} de ${knowledgeBase.documents.length} art?culos`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-2 text-center py-12 text-slate-500">No se encontraron art?culos con los filtros aplicados.</div>`;
    return;
  }

  container.innerHTML = filtered.map((doc) => {
    const meta = doc.metadata;
    return `
      <div class="bg-slate-950/80 border border-slate-800/90 hover:border-blue-500/50 transition-all rounded-xl p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ${meta.pilar || 'General'}
            </span>
            <span class="text-[11px] text-slate-500">${meta.date || ''}</span>
          </div>
          <h4 class="text-sm font-bold text-white mb-2 leading-snug hover:text-blue-400 cursor-pointer" onclick="askAboutDoc('${escapeQuote(meta.title)}')">
            ${meta.title}
          </h4>
          <p class="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">
            ${meta.summary || 'Sin resumen disponible'}
          </p>
        </div>
        
        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center space-x-1">
            <i data-lucide="tag" class="w-3 h-3 text-slate-500"></i>
            <span>${(meta.ramos || []).join(', ')}</span>
          </span>
          <button onclick="askAboutDoc('${escapeQuote(meta.title)}')" class="text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1">
            <span>Preguntar a la IA</span>
            <i data-lucide="arrow-right" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function escapeQuote(str) {
  return str.replace(/'/g, "\'");
}

function askAboutDoc(docTitle) {
  switchTab('chat');
  setQuery(`Expl?came a fondo, con visi?n ejecutiva y detalle t?cnico, el contenido y las conclusiones de: ${docTitle}`);
}

// B?squeda H?brida en Cliente (BM25 + TF-IDF)
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

// Generador del Prompt Especializado para Respuestas Explicativas (Estilo NotebookLM)
function buildNotebookLMPrompt(query, retrievedChunks) {
  const context = retrievedChunks.map((c, i) => 
    `=== DOCUMENTO [${i+1}]: "${c.title}" (Pilar: ${c.pilar || 'Seguros'} | Ramos: ${(c.ramos || []).join(', ')}) ===\n${c.text}\n`
  ).join('\n');

  return `Eres el Asistente Experto en Seguros (similar a NotebookLM de Google), especializado en actuarial, regulaci?n de la SSN, finanzas, operaciones y liderazgo para directores y gerentes de compa??as de seguros.

El usuario te formula la siguiente pregunta o consulta:
"${query}"

A continuaci?n tienes los fragmentos y documentos extra?dos de la base de conocimiento corporativa:
${context}

INSTRUCCIONES DE RESPUESTA (ESTILO NOTEBOOKLM):
1. **EXPLICACI?N CONVERSACIONAL Y PROFUNDA:** No te limites a citar o copiar texto. Explica los conceptos de forma fluida, did?ctica y completa, respondiendo directamente a lo que el l?der est? preguntando.
2. **RIGOR T?CNICO Y ACTUARIAL:** Si hay f?rmulas, m?todos (ej. Chain-Ladder vs Bornhuetter-Ferguson, Zillmer, Hattendorff, GLM, etc.) o normativas (ej. Resoluciones SSN, NIIF 17 / IFRS 17 CSM, Ley 17.418), explica la mec?nica paso a paso y por qu? funciona as?.
3. **IMPACTO EN EL NEGOCIO Y GESTI?N:** Incluye siempre c?mo esto impacta en la toma de decisiones, en el Combined Ratio, en la solvencia, en las operaciones o en la conducci?n de equipos.
4. **ESTRUCTURA VISUAL CLARA:** Usa t?tulos descriptivos, subt?tulos, listas con vi?etas destacadas en negrita y tablas comparativas cuando sea pertinente.
5. **CITAS DE FUENTES:** Indica de forma natural qu? documento o resoluci?n respalda cada punto clave (ej: "[Fuente: Combined Ratio en seguros de personas...]").

RESPUESTA EXPLICATIVA Y COMPLETA:`;
}

// Llamada Directa a Gemini API
async function callGeminiApi(prompt) {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
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
            maxOutputTokens: 2500
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      lastError = err;
      console.warn(`Fallo modelo ${model}:`, err.message);
    }
  }

  throw lastError;
}

// Manejador del Env?o de Chat
async function handleSend(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('user-input');
  const query = input.value.trim();
  if (!query) return;

  input.value = '';
  addChatMessage('user', query);

  const loadingMsgId = addLoadingMessage();
  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  try {
    const retrieved = searchHybrid(query, selectedPilar, selectedRamo, 5);
    
    if (!retrieved.length) {
      replaceLoadingMessage(loadingMsgId, 'No encontr? informaci?n relevante en el repositorio para esa consulta. Prueba con otros t?rminos o seleccionando "Todos los Pilares".');
      return;
    }

    const prompt = buildNotebookLMPrompt(query, retrieved);
    const answer = await callGeminiApi(prompt);
    
    replaceLoadingMessage(loadingMsgId, answer, retrieved);

  } catch (err) {
    console.error('Error generando respuesta:', err);
    replaceLoadingMessage(loadingMsgId, `**Error al procesar la respuesta con IA:** ${err.message}. Por favor intenta de nuevo en unos momentos.`);
  } finally {
    sendBtn.disabled = false;
  }
}

function setQuery(text) {
  document.getElementById('user-input').value = text;
  handleSend();
}

// Renderizado de Mensajes en el Chat
function addChatMessage(role, content, sources = []) {
  const container = document.getElementById('chat-messages');
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
            ${sources.map(s => `
              <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div class="font-bold text-white">? ${s.title} <span class="text-slate-500 font-normal">(${s.date || ''} | ${s.pilar || 'Seguros'})</span></div>
                <div class="text-slate-400 text-[11px] mt-1 line-clamp-2">${s.text}</div>
              </div>
            `).join('')}
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
  lucide.createIcons();
}

function addLoadingMessage() {
  const container = document.getElementById('chat-messages');
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
  lucide.createIcons();
  return id;
}

function replaceLoadingMessage(id, content, sources = []) {
  const el = document.getElementById(id);
  if (el) el.remove();
  addChatMessage('assistant', content, sources);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// Briefing Ejecutivo Consolidado Generado por Gemini
async function generateExecutiveBriefing() {
  const container = document.getElementById('briefing-content');
  
  container.innerHTML = `
    <div class="flex items-center space-x-3 text-sm text-slate-300 py-12 justify-center">
      <span class="w-3 h-3 rounded-full bg-blue-500 animate-ping mr-2"></span>
      <span>Gemini AI est? analizando los 51 art?culos y compilando el Briefing Estrat?gico...</span>
    </div>
  `;

  try {
    const briefQuery = "Genera un Briefing Ejecutivo de Alto Nivel estructurado en los 5 ejes estrat?gicos: 1) Modelos Actuariales y Reservas T?cnicas (IBNR, Zillmer, Hattendorff, etc.), 2) Impacto Normativo SSN y NIIF 17 (CSM, Res 287/2025, Res 24/2025), 3) Rentabilidad Financiera y Creaci?n de Valor (Combined Ratio, RAROC, EV/VNB, DuPont), 4) Transformaci?n Operativa, STP, Fraude e IA, 5) Liderazgo, Gesti?n de Mandos Medios y Equipos (GROW, RACI, Lencioni). Sintetiza los aprendizajes clave para un Director de Compa??a de Seguros.";
    const chunks = searchHybrid(briefQuery, 'Todos', 'Todos', 10);
    const prompt = buildNotebookLMPrompt(briefQuery, chunks);
    const answer = await callGeminiApi(prompt);
    container.innerHTML = marked.parse(answer);
  } catch (err) {
    container.innerHTML = `<p class="text-rose-400 font-semibold">Error generando el briefing: ${err.message}</p>`;
  }
}
