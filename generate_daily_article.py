import os
import sys
import re
import json
import time
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Configurar zona horaria de Argentina (UTC-3)
TZ_ARG = timezone(timedelta(hours=-3))

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

REPO_DIR = BASE_DIR / 'Repo'
REPO_DIR.mkdir(parents=True, exist_ok=True)

KB_FILE = BASE_DIR / 'knowledge_base.json'

ROTACION_SEMANAL = {
    0: ("Lunes", "Técnico actuarial / seguros de personas", "1. Técnico y Actuarial"),
    1: ("Martes", "Regulación argentina", "2. Normativa SSN y Legal"),
    2: ("Miércoles", "Gestión y liderazgo operativo", "5. Liderazgo y Gestión de Talento"),
    3: ("Jueves", "Tendencias de mercado y tecnología", "4. Operaciones, Fraude e Insurtech"),
    4: ("Viernes", "Administración de empresas", "3. Finanzas, Capital y Solvencia"),
    5: ("Sábado", "Profundización técnica avanzada", "1. Técnico y Actuarial"),
    6: ("Domingo", "Liderazgo con enfoque reflexivo", "5. Liderazgo y Gestión de Talento"),
}

def get_existing_topics() -> list[str]:
    topics = []
    # 1. Desde archivos locales en Repo/
    for f in REPO_DIR.glob('*.*'):
        clean = f.stem.replace('Copia de ', '').strip()
        if ' - ' in clean:
            topics.append(clean.split(' - ', 1)[1])
        else:
            topics.append(clean)
            
    # 2. Desde knowledge_base.json
    if KB_FILE.exists():
        try:
            with open(KB_FILE, 'r', encoding='utf-8') as f:
                kb = json.load(f)
                for doc in kb.get('documents', []):
                    title = doc.get('metadata', {}).get('title', '')
                    if ' - ' in title:
                        topics.append(title.split(' - ', 1)[1])
                    elif title:
                        topics.append(title)
        except Exception:
            pass
    return sorted(list(set(topics)))

def sanitize_text(text: str) -> str:
    # REGLA ESTRICTA: NUNCA usar el guion largo "—" ni "–"
    text = text.replace('—', '-').replace('–', '-')
    
    # Eliminar formato Markdown accidental (negritas, cursivas excesivas, numerales de encabezado)
    text = re.sub(r'^\s*#{1,6}\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    return text.strip()

def generate_article_content(target_date: str, weekday_num: int, existing_topics: list[str]) -> tuple[str, str]:
    dia_nombre, area_tematica, pilar = ROTACION_SEMANAL[weekday_num]
    
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY no encontrada en las variables de entorno.")

    recent_topics_sample = "\n".join([f"- {t}" for t in existing_topics[-45:]])

    system_instruction = f"""Sos el redactor principal del proyecto 'Aprendizaje Diario de Seguros'.
Tu tarea es investigar, validar y redactar el artículo técnico del día.

REGLAS INELUDIBLES:
1. AUDIENCIA: Líder de equipo, jefe de área o gerente en una Gerencia de Seguros de Personas y Retiro (suscripción, siniestros de Vida, Retiro, Accidentes Personales, Salud, equipo técnico y staff). Tratar en términos genéricos ('tu equipo', 'tu superior directo').
2. ÁREA TEMÁTICA DE HOY ({dia_nombre}): '{area_tematica}' (Pilar: {pilar}).
3. NO REPETICIÓN: Debe ser un tema original o con un enfoque técnico completamente distinto al ya tratado.
   Últimos temas tratados recientemente (NO REPETIR ESTOS TEMAS):
{recent_topics_sample}
4. INVESTIGACIÓN Y VERIFICACIÓN WEB: Verificá fechas, números de resoluciones de la SSN, leyes (17.418, 20.091, 22.400, etc.), fórmulas actuariales o cifras. NUNCA inventes números de resolución ni datos falsos.
5. ESTILO Y LENGUAJE: Español rioplatense (voseo profesional: 'tenés', 'hacés', 'considerá', 'tu equipo'). Tono objetivo, riguroso y técnico.
6. EXTENSIÓN: Entre 600 y 900 palabras (10 a 15 minutos de lectura).
7. PROHIBICIÓN DE CARACTERES: NUNCA uses el guion largo '—'. Usá únicamente el guion medio común '-'.
8. FORMATO: Texto plano limpio (sin markdown, sin negritas '**', sin encabezados '#', sin HTML).

ESTRUCTURA OBLIGATORIA DEL TEXTO:
Línea 1: TÍTULO DEL TEMA EN MAYÚSCULAS
Línea 2: (Línea en blanco)
Línea 3: Fecha: {target_date} | Área: {area_tematica} | Lectura estimada: 12 minutos
Línea 4: (Línea en blanco)
Línea 5: -----------------------------------------------------------------------
Línea 6: (Línea en blanco)
Línea 7: 1) CONCEPTO
(Explicación técnica, rigurosa y conceptual)
-----------------------------------------------------------------------
2) FÓRMULA / COMPONENTES / MECÁNICA
(Desglose de cálculo, ecuación actuarial, componentes o mecánica operativa)
-----------------------------------------------------------------------
3) APLICABILIDAD POR RAMO / CONTEXTO
(Impacto diferenciado en Vida, Retiro, Accidentes Personales y/o Salud)
-----------------------------------------------------------------------
4) EJEMPLO NUMÉRICO O CASO CONCRETO
(Cálculo realista con números concretos en contexto asegurador argentino)
-----------------------------------------------------------------------
5) APLICACIÓN PRÁCTICA PARA UN LÍDER DE EQUIPO
(Acciones concretas de gestión, toma de decisiones, KPIs o diálogo con superiores)
-----------------------------------------------------------------------
6) ERRORES COMUNES O PUNTOS CIEGOS
(Fallos habituales, trampas conceptuales o descuidos en la práctica)
-----------------------------------------------------------------------
7) EN UNA LÍNEA
(Síntesis contundente y memorable en una sola oración)
-----------------------------------------------------------------------
FUENTES DE REFERENCIA
- Fuente 1 (Ley, resolución SSN, libro o paper actuarial verificado)
- Fuente 2
"""

    prompt = f"Investigá y redactá el artículo completo para el día {target_date} ({dia_nombre}, pilar {area_tematica}). Entregá únicamente el texto plano con la estructura fija solicitada."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "tools": [{"googleSearch": {}}],
        "generationConfig": {
            "temperature": 0.4
        }
    }

    resp = requests.post(url, json=payload, timeout=60)
    if resp.status_code != 200:
        raise RuntimeError(f"Error en Gemini API: {resp.status_code} - {resp.text}")

    res_json = resp.json()
    raw_content = res_json['candidates'][0]['content']['parts'][0]['text']
    clean_content = sanitize_text(raw_content)

    # Extraer título del artículo
    lines = [l.strip() for l in clean_content.splitlines() if l.strip()]
    first_line = lines[0] if lines else "Artículo de Seguros"
    
    # Limpiar título para nombre de archivo
    title_for_file = re.sub(r'[\\/*?:"<>|]', '', first_line)
    title_for_file = title_for_file.replace('TÍTULO:', '').replace('TITULO:', '').strip()
    # Poner en formato título estándar
    title_clean = title_for_file.title()

    full_title = f"{target_date} - {title_clean}"
    return full_title, clean_content

def save_and_index(full_title: str, content: str) -> str:
    # 1. Guardar archivo .txt en Repo/
    txt_path = REPO_DIR / f"{full_title}.txt"
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[*] Guardado archivo de texto: {txt_path.name}")

    # 2. Guardar archivo .docx si python-docx está disponible
    try:
        import docx
        from docx.shared import Pt, Inches, RGBColor
        doc = docx.Document()
        for section in doc.sections:
            section.top_margin = Inches(1)
            section.bottom_margin = Inches(1)
            section.left_margin = Inches(1)
            section.right_margin = Inches(1)

        for line in content.splitlines():
            s = line.strip()
            if not s:
                doc.add_paragraph()
            elif s.startswith('---'):
                p = doc.add_paragraph()
                r = p.add_run('-' * 40)
                r.font.color.rgb = RGBColor(180, 180, 180)
            elif any(s.startswith(f"{i})") for i in range(1, 8)) or s.startswith("FUENTES"):
                p = doc.add_paragraph()
                r = p.add_run(s)
                r.bold = True
                r.font.size = Pt(12)
                r.font.color.rgb = RGBColor(26, 82, 118)
            elif s.startswith("Fecha:"):
                p = doc.add_paragraph()
                r = p.add_run(s)
                r.italic = True
                r.font.size = Pt(10)
                r.font.color.rgb = RGBColor(100, 100, 100)
            else:
                p = doc.add_paragraph(s)
                p.paragraph_format.line_spacing = 1.15
                p.paragraph_format.space_after = Pt(4)

        docx_path = REPO_DIR / f"{full_title}.docx"
        doc.save(docx_path)
        print(f"[*] Guardado documento Word: {docx_path.name}")
    except Exception as e:
        print(f"[!] Aviso al generar docx: {e}")

    # 3. Disparar indexación local o de nube si existe cloud_ingestion.py
    try:
        from cloud_ingestion import process_file_payload
        print("[*] Documento listo para sincronización con knowledge_base.")
    except Exception:
        pass

    return str(txt_path)

def run():
    now_arg = datetime.now(TZ_ARG)
    target_date = now_arg.strftime('%Y-%m-%d')
    weekday_num = now_arg.weekday()

    # Si se pasó fecha específica por argumento CLI
    if len(sys.argv) > 1 and re.match(r'^\d{4}-\d{2}-\d{2}$', sys.argv[1]):
        target_date = sys.argv[1]
        dt = datetime.strptime(target_date, '%Y-%m-%d')
        weekday_num = dt.weekday()

    print(f"=== INICIANDO GENERACIÓN AUTOMÁTICA DE ARTÍCULO: {target_date} ===")
    dia, area, pilar = ROTACION_SEMANAL[weekday_num]
    print(f"[*] Día: {dia} | Área: {area} | Pilar: {pilar}")

    existing = get_existing_topics()
    print(f"[*] Total de temas históricos relevados: {len(existing)}")

    # Verificar si ya existe un artículo para esta fecha exacta
    matches = list(REPO_DIR.glob(f"{target_date} *.*"))
    if matches and '--force' not in sys.argv:
        print(f"[OK] Ya existe un artículo generado para la fecha {target_date}: {matches[0].name}")
        return

    full_title, content = generate_article_content(target_date, weekday_num, existing)
    print(f"[*] Artículo generado exitosamente: {full_title}")
    words = len(content.split())
    print(f"[*] Conteo de palabras: {words} (rango 600-900)")

    save_and_index(full_title, content)
    print("=== PROCESO COMPLETADO EXITOSAMENTE ===")

if __name__ == '__main__':
    run()
