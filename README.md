# 🛡️ SegurosAI - Knowledge Hub & RAG 100% Automatizado para Líderes de Seguros

Sistema de Inteligencia Artificial y Recuperación Aumentada por Generación (RAG) diseñado específicamente para directores, gerentes técnicos, actuarios y líderes del sector asegurador.

El sistema monitorea en tiempo real la carpeta `Repo/` (Google Drive) e indexa automáticamente cualquier documento nuevo o modificado sin requerir ninguna acción manual.

---

## 🚀 Inicio Rápido

### 1. Iniciar la Aplicación Web (Streamlit)
Haz doble clic en **`run_app.bat`** o ejecuta en la terminal:
```bash
streamlit run app.py
```
Se abrirá automáticamente el Dashboard en tu navegador (`http://localhost:8501`).

### 2. Iniciar el Monitoreo Continuo Desatendido (Watcher)
Haz doble clic en **`run_watcher.bat`** o ejecuta:
```bash
python watcher.py
```
El *Watcher* vigila la carpeta `Repo/` y en cuanto agregues o modifiques un archivo (`.gdoc`, `.pdf`, `.docx`, `.txt`), lo procesa y actualiza la base de conocimiento en segundos.

---

## 📊 Estado Actual de la Base de Conocimiento

* **Total de Documentos:** 51 artículos técnicos y estratégicos.
* **Total de Fragmentos Semánticos:** 390 chunks indexados con metadatos.
* **Pilares Cubiertos:**
  1. **1. Técnico y Actuarial** (17 artículos): *IBNR Chain-Ladder y Bornhuetter-Ferguson, Reservas matemáticas, Zillmer, Hattendorff, GLM, Lee-Carter, Credibilidad Bühlmann, Reaseguro, etc.*
  2. **2. Normativa SSN y Legal** (10 artículos): *Res. SSN 24/2025 (Capital UVA), Res. SSN 287/2025 (Reservas y Tasa de Pasivos), NIIF 17 / IFRS 17 (CSM), Ley 17.418 (Reticencia e Incontestabilidad), Inversiones computables, etc.*
  3. **3. Finanzas, Capital y Solvencia** (6 artículos): *Combined Ratio, Embedded Value / VNB, RAROC, WACC, Análisis DuPont, Balanced Scorecard, 5 Fuerzas de Porter.*
  4. **4. Operaciones, Fraude e Insurtech** (13 artículos): *IA Generativa en Suscripción, Modelos Predictivos, STP en Siniestros, Analítica de Fraude, Open Insurance, Seguros Embebidos, UBI & Wearables, KPIs Operativos, Matrices RACI.*
  5. **5. Liderazgo y Gestión de Talento** (5 artículos): *Liderazgo desde el mando medio, Delegación efectiva, Liderazgo situacional (Hersey-Blanchard), Modelo GROW, 5 Disfunciones de Lencioni, Gestión del Desempeño.*

---

## 💡 Preguntas de Prueba Recomendadas para Líderes

1. **Actuarial / Siniestros:** *"Compara las ventajas y limitaciones de los métodos Chain-Ladder y Bornhuetter-Ferguson para el cálculo de IBNR en seguros."*
2. **Normativa SSN / NIIF 17:** *"¿Qué cambios introduce la Resolución SSN 287/2025 en reservas técnicas y cómo se relaciona con el Margen de Servicio Contractual (CSM) bajo NIIF 17?"*
3. **Gestión y Rentabilidad:** *"¿Cuáles son las palancas operativas y de IA generativa para optimizar el Combined Ratio en seguros de personas?"*
4. **Talento y Dirección:** *"¿Cómo aplicar el modelo GROW y las matrices RACI para mejorar la delegación y liderazgo en mandos medios técnicos?"*

---

## 🛠️ Arquitectura de Archivos

```
├── Repo/                    # Carpeta origen de documentos (Google Drive)
├── data/
│   └── storage/
│       ├── insurance_knowledge_base.json  # Índice estructurado con chunks y metadatos
│       └── ingestion_state.json           # Control de estados y mtime para auto-sync
├── config.py                # Configuración de rutas, pilares y modelos
├── ingestion.py             # Parser multihilo paralelo para .gdoc, .pdf, .docx, .txt
├── rag_engine.py            # Motor RAG híbrido (BM25 + Semántico + Prompt de Seguros)
├── watcher.py               # Demonio watchdog para auto-indexación desatendida
├── app.py                   # Dashboard interactivo en Streamlit
├── run_app.bat              # Lanzador rápido de la app web
├── run_watcher.bat          # Lanzador del servicio watcher
└── README.md                # Documentación del sistema
```
