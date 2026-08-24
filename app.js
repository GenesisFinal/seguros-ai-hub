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

    if (textLower.includes(query.toLowerCase())) score += 6.0;
    if (titleLower.includes(query.toLowerCase())) score += 12.0;

    if (score > 0) {
      scored.push({ ...chunk, score });
    }
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// Síntesis Inteligente Autónoma (Zero-API Key)
function synthesizeDirectAnswer(query, retrievedChunks) {
  if (!retrievedChunks || !retrievedChunks.length) {
    return "No se encontraron documentos directamente relacionados en el repositorio. Prueba ajustando los términos de búsqueda o revisando el explorador.";
  }

  const primary = retrievedChunks[0];
  let markdown = `### 📊 Análisis Estratégico & Hallazgos Clave\n\n`;
  markdown += `En base al análisis de **${retrievedChunks.length} fuentes especializadas** del repositorio corporativo:\n\n`;

  // Resumen principal
  markdown += `#### 📌 **1. Concepto y Fundamento Técnico**\n`;
  markdown += `> *${primary.title}* (${primary.pilar || 'Seguros'})\n\n`;
  markdown += `${cleanSnippet(primary.text)}\n\n`;

  // Fuentes secundarias o complementarias
  if (retrievedChunks.length > 1) {
    markdown += `#### 🔍 **2. Aspectos Complementarios y Cruce Normativo/Operativo**\n\n`;
    for (let i = 1; i < Math.min(retrievedChunks.length, 3); i++) {
      const c = retrievedChunks[i];
      markdown += `* **${c.title}** (${c.pilar || 'Seguros'} | Fecha: ${c.date || 'N/D'}):\n`;
      markdown += `  ${cleanSnippet(c.text, 350)}\n\n`;
    }
  }

  // Palancas de gestión para líderes
  markdown += `#### 💡 **3. Palancas de Gestión para Líderes & Directivos**\n`;
  markdown += `* **Alineación Regulatoria y Actuarial:** Contrastar estos parámetros con los estándares de la SSN y normativas contables vigentes.\n`;
  markdown += `* **Monitoreo Mensual:** Integrar los indicadores de *${primary.title}* en el tablero de control de gestión.\n`;
  markdown += `* **Aplicabilidad en Negocio:** Evaluar el impacto en suscripción, siniestralidad o rentabilidad técnica según los ramos afectados (*${(primary.ramos || ['Seguros']).join(', ')}*).\n\n`;

  return markdown;
}

function cleanSnippet(text, maxLen = 500) {
  let clean = text.replace(/^[0-9]+\)\s+[A-ZÁÉÍÓÚÑ\s]{3,}/g, '').trim();
  clean = clean.replace(/──+/g, '').replace(/--+/g, '').trim();
  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen - 3) + '...';
  }
  return clean;
}

// Llamada Opcional a Gemini API (si el usuario la tiene)
async function callGeminiApi(prompt, apiKey) {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, topP: 0.95 }
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
    } catch (err) {
      console.warn(`Fallo con modelo ${model}:`, err.message);
    }
  }
  return null;
}

// Manejador de Chat
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

    let answer = null;

    // Si hay API key configurada, intentar generar con Gemini
    if (apiKey) {
      const prompt = `Eres el Asistente de Inteligencia Estratégica para Líderes de Seguros. Responde a: "${query}" basándote en:\n` +
        retrieved.map((c, i) => `[${i+1}] ${c.title}:\n${c.text}`).join('\n\n') +
        `\n\nResponde en español profesional, con viñetas, citas [Fuente: ...] y conclusiones ejecutivas.`;
      answer = await callGeminiApi(prompt, apiKey);
    }

    // Si no hay API key o falló, usar la síntesis autónoma instantánea
    if (!answer) {
      answer = synthesizeDirectAnswer(query, retrieved);
    }

    replaceLoadingMessage(loadingMsgId, answer, retrieved);

  } catch (err) {
    replaceLoadingMessage(loadingMsgId, `**Error procesando consulta:** ${err.message}`);
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
          <summary class="cursor-pointer text-blue-400 font-semibold hover:text-blue-300">📚 Ver ${sources.length} Fuentes Originales Consultadas</summary>
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
      <span>Consultando repositorio de seguros...</span>
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

// Briefing Ejecutivo Consolidado Autónomo
async function generateExecutiveBriefing() {
  const container = document.getElementById('briefing-content');
  
  container.innerHTML = `
    <div class="flex items-center space-x-3 text-sm text-slate-400 py-12 justify-center">
      <span class="w-3 h-3 rounded-full bg-blue-500 animate-ping mr-2"></span>
      <span>Compilando inteligencia estratégica de los 51 artículos del repositorio...</span>
    </div>
  `;

  // Compilar resumen de los 5 pilares estratégicos
  const docs = knowledgeBase.documents || [];
  
  const pilars = [
    { name: "1. Técnico y Actuarial", icon: "📐", key: "Técnico y Actuarial" },
    { name: "2. Normativa SSN y Legal", icon: "📜", key: "Normativa SSN" },
    { name: "3. Finanzas, Capital y Solvencia", icon: "📈", key: "Finanzas" },
    { name: "4. Operaciones, Fraude e Insurtech", icon: "⚡", key: "Operaciones" },
    { name: "5. Liderazgo y Gestión de Talento", icon: "👥", key: "Liderazgo" }
  ];

  let briefingMd = `# 🛡️ Briefing Estratégico Consolidado para la Dirección\n\n`;
  briefingMd += `*Consolidación ejecutiva de los **51 artículos y normativas** indexados en el Repositorio de Seguros.*\n\n---\n\n`;

  pilars.forEach(p => {
    const pDocs = docs.filter(d => (d.metadata.pilar || '').includes(p.key));
    briefingMd += `### ${p.icon} **${p.name}** *(${pDocs.length} Artículos Especializados)*\n\n`;
    
    pDocs.slice(0, 4).forEach(d => {
      const m = d.metadata;
      briefingMd += `* **${m.title}** (${m.date || ''}):\n`;
      briefingMd += `  ${m.summary}\n\n`;
    });
  });

  briefingMd += `\n---\n### 💡 **Conclusiones y Recomendaciones para la Alta Gerencia**\n`;
  briefingMd += `1. **Monitoreo Técnico Continuo:** Fortalecer el seguimiento del Combined Ratio y los estudios de experiencia actuarial (A/E) frente a la volatilidad de siniestros.\n`;
  briefingMd += `2. **Cumplimiento Regulatorio Proactivo:** Asegurar la alineación con las nuevas exigencias de reservas técnicas de la SSN y la transición metodológica del CSM bajo NIIF 17.\n`;
  briefingMd += `3. **Automatización & Fraude:** Impulsar el procesamiento directo (STP) y la analítica predictiva en suscripción para contener costos operativos.\n`;
  briefingMd += `4. **Liderazgo Técnico:** Aplicar matrices RACI y conversaciones de desempeño estructuradas (GROW) para potenciar la delegación en mandos medios.\n`;

  container.innerHTML = marked.parse(briefingMd);
}

// Gestión de API Key Opcional
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
  statusText.innerText = key ? 'Gemini API: Conectada' : 'Motor Autónomo: Activo';
  badge.className = 'w-2 h-2 rounded-full bg-emerald-400';
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
