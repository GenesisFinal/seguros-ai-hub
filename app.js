// Estado global de la aplicación
let knowledgeBase = { documents: [], chunks: [], total_docs: 0, total_chunks: 0 };
let currentTab = 'chat';
let selectedPilar = 'Todos';
let selectedRamo = 'Todos';

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
  initApiKey();
  await loadKnowledgeBase();
  renderExplorerArticles();
  lucide.createIcons();
});

// Cargar la base de conocimiento desde el JSON estático
async function loadKnowledgeBase() {
  try {
    const res = await fetch('knowledge_base.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    knowledgeBase = await res.json();
    
    document.getElementById('stat-docs').innerText = knowledgeBase.total_docs || knowledgeBase.documents.length;
    document.getElementById('stat-chunks').innerText = knowledgeBase.total_chunks || knowledgeBase.chunks.length;
    document.getElementById('explorer-count').innerText = `Mostrando ${knowledgeBase.documents.length} artículos indexados`;
  } catch (err) {
    console.error('Error cargando knowledge_base.json:', err);
    document.getElementById('sync-status-badge').innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400 mr-1.5"></span> Error al cargar`;
  }
}

// Navegación entre Pestañas
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
    chat: 'Chat Estratégico para Líderes de Seguros',
    explorer: 'Explorador del Repositorio de Documentos',
    briefing: 'Briefing Ejecutivo Consolidado',
    guide: 'Guía de Publicación en GitHub Pages'
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

// Renderizar Artículos en el Explorador
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

  document.getElementById('explorer-count').innerText = `Mostrando ${filtered.length} de ${knowledgeBase.documents.length} artículos`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-2 text-center py-12 text-slate-500">No se encontraron artículos con los filtros aplicados.</div>`;
    return;
  }

  container.innerHTML = filtered.map((doc, idx) => {
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
            <span>Consultar</span>
            <i data-lucide="arrow-right" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function escapeQuote(str) {
  return str.replace(/'/g, "\\'");
}

function askAboutDoc(docTitle) {
  switchTab('chat');
  setQuery(`Explícame los conceptos principales, conclusiones y palancas de gestión del documento: ${docTitle}`);
}

// Búsqueda Híbrida en Cliente (BM25 + TF-IDF)
function searchHybrid(query, pilarFilter = 'Todos', ramoFilter = 'Todos', topK = 5) {
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

    if (textLower.includes(query.toLowerCase())) score += 5.0;
    if (titleLower.includes(query.toLowerCase())) score += 10.0;

    if (score > 0) {
      scored.push({ ...chunk, score });
    }
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// Construcción del Prompt RAG
function buildRAGPrompt(query, retrievedChunks) {
  const context = retrievedChunks.map((c, i) => 
    `--- FUENTE [${i+1}]: ${c.title} (Fecha: ${c.date || 'N/D'} | Pilar: ${c.pilar || 'General'}) ---\n${c.text}\n`
  ).join('\n');

  return `Eres el Asistente de Inteligencia Estratégica para Líderes y Directivos de Seguros (actuarios, gerentes técnicos, directores comerciales y de operaciones).

Tu tarea es responder la siguiente pregunta basándote ESTRICTAMENTE en las fuentes provistas del repositorio corporativo.

REGLAS:
1. Responde en español profesional, con lenguaje técnico asegurador riguroso pero con visión ejecutiva clara.
2. CITA SIEMPRE LAS FUENTES explícitamente al final de cada afirmación usando el formato: [Fuente: Título del Documento].
3. Si la información solicitada no está en los documentos provistos, acláralo expresamente.
4. Organiza la respuesta con títulos claros, viñetas y una sección final de "💡 Conclusiones / Palancas de Gestión para Líderes".

PREGUNTA DEL LÍDER:
${query}

FUENTES DISPONIBLES:
${context}

RESPUESTA EJECUTIVA:`;
}

// Llamada Directa a la API de Gemini desde el Navegador
async function callGeminiApi(prompt, apiKey) {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se recibió texto en la respuesta.';
    } catch (err) {
      lastError = err;
      console.warn(`Fallo con modelo ${model}:`, err.message);
    }
  }

  throw lastError;
}

// Manejador del Envío de Chat
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
    const apiKey = getApiKey();

    if (!apiKey) {
      let fallbackText = `### 📄 Fuentes Relevantes Encontradas:\n\n*(Para generar la síntesis completa con razonamiento de Gemini, ingresa tu API Key en la barra lateral)*\n\n`;
      retrieved.forEach((r, i) => {
        fallbackText += `**${i+1}. ${r.title}** (Pilar: *${r.pilar}*)\n> ${r.text.substring(0, 300)}...\n\n`;
      });
      replaceLoadingMessage(loadingMsgId, fallbackText, retrieved);
      return;
    }

    if (!retrieved.length) {
      replaceLoadingMessage(loadingMsgId, 'No se encontraron documentos relevantes en el repositorio para la consulta ingresada.');
      return;
    }

    const prompt = buildRAGPrompt(query, retrieved);
    const answer = await callGeminiApi(prompt, apiKey);
    replaceLoadingMessage(loadingMsgId, answer, retrieved);

  } catch (err) {
    replaceLoadingMessage(loadingMsgId, `**Error consultando Gemini API:** ${err.message}\n\nVerifica que tu API Key sea válida.`);
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
      <div class="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-md leading-relaxed">
        ${escapeHtml(content)}
      </div>
      <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 text-xs font-bold">
        TÚ
      </div>
    `;
  } else {
    const htmlContent = marked.parse(content);
    let sourcesHtml = '';
    if (sources && sources.length) {
      sourcesHtml = `
        <details class="mt-4 pt-3 border-t border-slate-700/60 text-xs">
          <summary class="cursor-pointer text-blue-400 font-semibold hover:text-blue-300">📚 Ver ${sources.length} Fuentes Consultadas</summary>
          <div class="mt-2 space-y-2 text-slate-300">
            ${sources.map(s => `
              <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div class="font-bold text-white">• ${s.title} <span class="text-slate-500 font-normal">(${s.date || ''})</span></div>
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
    <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 text-white">
      <i data-lucide="bot" class="w-4 h-4"></i>
    </div>
    <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center space-x-2">
      <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping mr-2"></span>
      <span>Consultando repositorio y sintetizando con Gemini...</span>
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

// Briefing Ejecutivo Consolidado
async function generateExecutiveBriefing() {
  const container = document.getElementById('briefing-content');
  const apiKey = getApiKey();

  if (!apiKey) {
    container.innerHTML = `<p class="text-amber-400">⚠️ Por favor configura tu Gemini API Key en la barra lateral para generar el Briefing con Inteligencia Artificial.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="flex items-center space-x-3 text-sm text-slate-400 py-12 justify-center">
      <span class="w-3 h-3 rounded-full bg-blue-500 animate-ping mr-2"></span>
      <span>Sintetizando conocimientos estratégicos de los 51 artículos del repositorio...</span>
    </div>
  `;

  try {
    const briefQuery = "Genera un Briefing Ejecutivo de Alto Nivel estructurado en 5 ejes estratégicos: 1) Modelos Actuariales y Reservas Técnicas, 2) Impacto Normativo SSN y NIIF 17 (CSM), 3) Rentabilidad Financiera (Combined Ratio, RAROC, EV), 4) Transformación Operativa, Fraude e IA, 5) Liderazgo y Equipos. Sintetiza los aprendizajes clave para un Director de Compañía de Seguros.";
    const chunks = searchHybrid(briefQuery, 'Todos', 'Todos', 10);
    const prompt = buildRAGPrompt(briefQuery, chunks);
    const answer = await callGeminiApi(prompt, apiKey);
    container.innerHTML = marked.parse(answer);
  } catch (err) {
    container.innerHTML = `<p class="text-rose-400">Error generando briefing: ${err.message}</p>`;
  }
}

// Gestión de API Key en localStorage
function getApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

function initApiKey() {
  const key = getApiKey();
  updateApiKeyUi(key);
}

function updateApiKeyUi(key) {
  const statusText = document.getElementById('api-key-status-text');
  const badge = document.getElementById('api-key-badge');
  if (key) {
    statusText.innerText = 'Gemini API: Conectada';
    badge.className = 'w-2 h-2 rounded-full bg-emerald-400';
  } else {
    statusText.innerText = 'Configurar Gemini API';
    badge.className = 'w-2 h-2 rounded-full bg-amber-400';
  }
}

function openApiKeyModal() {
  document.getElementById('modal-api-key-input').value = getApiKey();
  document.getElementById('api-modal').classList.remove('hidden');
}

function closeApiKeyModal() {
  document.getElementById('api-modal').classList.add('hidden');
}

function saveApiKey() {
  const val = document.getElementById('modal-api-key-input').value.trim();
  if (val) {
    localStorage.setItem('gemini_api_key', val);
  } else {
    localStorage.removeItem('gemini_api_key');
  }
  updateApiKeyUi(val);
  closeApiKeyModal();
}
