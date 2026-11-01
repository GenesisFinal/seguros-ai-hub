import os
import sys
import json
import re
import time
import zipfile
import xml.etree.ElementTree as ET
import requests
from pathlib import Path
from collections import defaultdict

PILARS = {
    '1': '1. Técnico y Actuarial',
    '2': '2. Normativa SSN y Legal',
    '3': '3. Finanzas, Capital y Solvencia',
    '4': '4. Operaciones, Fraude e Insurtech',
    '5': '5. Liderazgo y Gestión de Talento'
}

def clean_spanish_string(text: str) -> str:
    if not text:
        return ""
    res = str(text)
    repls = [
        (r'T\?cnico', 'Técnico'), (r't\?cnico', 'técnico'),
        (r'T\?cnica', 'Técnica'), (r't\?cnica', 'técnica'),
        (r'Gesti\?n', 'Gestión'), (r'gesti\?n', 'gestión'),
        (r'Matem\?tica', 'Matemática'), (r'matem\?tica', 'matemática'),
        (r'Matem\?ticas', 'Matemáticas'), (r'matem\?ticas', 'matemáticas'),
        (r'M\?todo', 'Método'), (r'm\?todo', 'método'),
        (r'Descomposici\?n', 'Descomposición'), (r'descomposici\?n', 'descomposición'),
        (r'Suscripci\?n', 'Suscripción'), (r'suscripci\?n', 'suscripción'),
        (r'Resoluci\?n', 'Resolución'), (r'resoluci\?n', 'resolución'),
        (r'Regulaci\?n', 'Regulación'), (r'regulaci\?n', 'regulación'),
        (r'Operaci\?n', 'Operación'), (r'operaci\?n', 'operación'),
        (r'Ambig\?edad', 'Ambigüedad'), (r'ambig\?edad', 'ambigüedad'),
        (r'Distribuci\?n', 'Distribución'), (r'distribuci\?n', 'distribución'),
        (r'Optimizaci\?n', 'Optimización'), (r'optimizaci\?n', 'optimización'),
        (r'Prevenci\?n', 'Prevención'), (r'prevenci\?n', 'prevención'),
        (r'Protecci\?n', 'Protección'), (r'protecci\?n', 'protección'),
        (r'Informaci\?n', 'Información'), (r'informaci\?n', 'información'),
        (r'Art\?culo', 'Artículo'), (r'art\?culo', 'artículo'),
        (r'Art\?culos', 'Artículos'), (r'art\?culos', 'artículos'),
        (r'L\?der', 'Líder'), (r'l\?der', 'líder'),
        (r'L\?deres', 'Líderes'), (r'l\?deres', 'líderes'),
        (r'Gu\?a', 'Guía'), (r'gu\?a', 'guía'),
        (r'Dise\?o', 'Diseño'), (r'dise\?o', 'diseño'),
        (r'A\?o', 'Año'), (r'a\?o', 'año'),
        (r'Compa\?a', 'Compañía'), (r'compa\?a', 'compañía'),
        (r'Desaf\?o', 'Desafío'), (r'desaf\?o', 'desafío'),
        (r'Pol\?tica', 'Política'), (r'pol\?tica', 'política'),
        (r'B\?hlmann', 'Bühlmann'), (r'b\?hlmann', 'bühlmann'),
        (r'Estrat\?gic[ao]', 'Estratégica'), (r'estrat\?gic[ao]', 'estratégica'),
        (r'Tarificaci\?n', 'Tarificación'), (r'tarificaci\?n', 'tarificación'),
        (r'P\?liza', 'Póliza'), (r'p\?liza', 'póliza'),
        (r'C\?lculo', 'Cálculo'), (r'c\?lculo', 'cálculo'),
        (r'Funci\?n', 'Función'), (r'funci\?n', 'función'),
        (r'L\?mite', 'Límite'), (r'l\?mite', 'límite'),
        (r'\?rea', 'área'), (r'\?REA', 'ÁREA'),
        (r'\ufffd', '')
    ]
    for p, r in repls:
        res = re.sub(p, r, res)
    return res

def get_canonical_key(name: str) -> str:
    n = Path(name).name.replace('Copia de ', '').strip()
    n = re.sub(r'\.(docx|gdoc|pdf|txt|md)$', '', n, flags=re.IGNORECASE)
    m = re.search(r'^(\d{4}-\d{2}-\d{2})', n)
    date_part = m.group(1) if m else 'sin-fecha'
    clean_text = re.sub(r'[^\w\s]', ' ', n.lower())
    clean_text = ' '.join(clean_text.split())
    return f"{date_part}____{clean_text}"

def classify_pilar(text: str, title: str) -> str:
    lower = (title + ' ' + text[:2000]).lower()
    if any(k in lower for k in ['ibnr', 'chain-ladder', 'bornhuetter', 'reserva matemática', 'reserva matematica', 'zillmer', 'hattendorff', 'lee-carter', 'buhlmann', 'bühlmann', 'credibilidad', 'semi-markov', 'glm', 'experiencia actuarial', 'submortalidad', 'longevidad', 'reaseguro', 'tarificación', 'tarificacion', 'sensibilidad', 'pasivos técnicos', 'dfa', 'estocástica']):
        return PILARS['1']
    elif any(k in lower for k in ['resolución ssn', 'resolucion ssn', 'res. ssn', 'ssn', 'niif 17', 'ifrs 17', 'csm', 'ley 17.418', 'ley 22.400', 'productores asesores', 'pas', 'reticencia', 'incontestabilidad', 'depósito de planes', 'deposito de planes', 'régimen de inversiones', 'regimen de inversiones', 'activos computables', 'institorios', 'reclamos', 'gobierno societario', 'sgir']):
        return PILARS['2']
    elif any(k in lower for k in ['combined ratio', 'embedded value', 'value of new business', 'vnb', 'raroc', 'wacc', 'dupont', 'presupuestación', 'presupuestacion', 'costo de capital', 'balanced scorecard', 'cuadro de mando', 'porter', 'cinco fuerzas', 'alm', 'activos y pasivos', 'costos indirectos', 'activity-based']):
        return PILARS['3']
    elif any(k in lower for k in ['ia generativa', 'inteligencia artificial generativa', 'underwriting', 'modelos predictivos', 'fraude', 'stp', 'straight-through', 'open insurance', 'embedded insurance', 'seguros embebidos', 'wearables', 'ubi', 'telemetría', 'telemetria', 'kpis operativos', 'raci', 'priorización operativa', 'demandas concurrentes', 'scrum', 'kanban', 'ágiles']):
        return PILARS['4']
    elif any(k in lower for k in ['liderar', 'mando medio', 'delegación', 'delegacion', 'uno a uno', 'reunión uno', 'reunion uno', 'grow', 'lencioni', 'cinco disfunciones', 'desempeño', 'desempeno', 'situacional', 'sucesión', 'sucesion', 'transformacional', 'persona clave', 'coaching', 'doble bucle', 'kotter', 'kolb', 'schön', 'metacognición', 'metaevaluación', 'liderazgo']):
        return PILARS['5']
    return PILARS['1']

def classify_ramos(text: str) -> list:
    lower = text.lower()
    ramos = []
    if 'vida' in lower: ramos.append('Vida')
    if 'retiro' in lower or 'rentas' in lower: ramos.append('Retiro')
    if 'accidentes personales' in lower or ' ap ' in lower: ramos.append('Accidentes Personales')
    if 'salud' in lower: ramos.append('Salud')
    if 'automotores' in lower or 'autos' in lower or 'flotas' in lower: ramos.append('Automotores')
    if 'patrimoniales' in lower or 'cauc' in lower or 'incendio' in lower: ramos.append('Patrimoniales')
    return ramos if ramos else ['Personas / Integral']

def parse_local_docx(file_path: Path) -> str:
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            paragraphs = []
            for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                p_text = ''.join(p.itertext()).strip()
                if p_text:
                    paragraphs.append(p_text)
            return '\n\n'.join(paragraphs) if paragraphs else ' '.join(tree.itertext())
    except Exception:
        return ''

def build_document_entry(name: str, text: str, doc_id: str = '') -> dict:
    clean_title = clean_spanish_string(
        name.replace('.gdoc', '').replace('.docx', '').replace('.pdf', '').replace('.txt', '').replace('Copia de ', '').strip()
    )
    lines = [clean_spanish_string(l.strip()) for l in text.splitlines() if l.strip() and not l.strip().startswith('──') and not l.strip().startswith('--')]

    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', clean_title) or re.search(r'Fecha:\s*(\d{4}-\d{2}-\d{2})', text)
    doc_date = date_match.group(1) if date_match else 'Sin fecha'
    doc_title = clean_title
    if doc_date != 'Sin fecha' and not doc_title.startswith(doc_date):
        doc_title = f'{doc_date} - {doc_title}'

    pilar = classify_pilar(text, doc_title)
    ramos = classify_ramos(text)

    summary_lines = [l for l in lines[1:] if len(l) > 30 and not l.startswith('Fecha:') and not l.startswith('Área:') and not l.startswith('Area:') and not re.match(r'^\d\)', l)]
    summary = summary_lines[0] if summary_lines else clean_title
    if len(summary) > 230:
        summary = summary[:227] + '...'

    words = text.split()
    chunks = []
    chunk_idx = 0
    i = 0
    while i < len(words):
        chunk_text = ' '.join(words[i:i+250])
        chunks.append({
            'chunk_id': f'{doc_title}_{chunk_idx}',
            'title': doc_title,
            'date': doc_date,
            'pilar': pilar,
            'ramos': ramos,
            'text': chunk_text,
            'chunk_index': chunk_idx
        })
        chunk_idx += 1
        i += 200

    return {
        'metadata': {
            'title': doc_title,
            'original_filename': name,
            'date': doc_date,
            'pilar': pilar,
            'ramos': ramos,
            'summary': summary,
            'char_count': len(text),
            'word_count': len(words),
            'doc_id': doc_id,
            'original_ext': Path(name).suffix.lower() or '.gdoc',
            'download_docx_url': f'https://docs.google.com/document/d/{doc_id}/export?format=docx' if doc_id else '',
            'download_pdf_url': f'https://docs.google.com/document/d/{doc_id}/export?format=pdf' if doc_id else '',
            'download_txt_url': f'https://docs.google.com/document/d/{doc_id}/export?format=txt' if doc_id else '',
            'gdoc_url': f'https://docs.google.com/document/d/{doc_id}/edit' if doc_id else ''
        },
        'file_path': name,
        'total_chunks': len(chunks),
        'chunks': chunks,
        'content_preview': text[:500],
        'full_text': text
    }

def process_file_payload(file_info):
    name = file_info.get('name', 'Sin título')
    doc_id = file_info.get('id', '')
    if not doc_id:
        return None

    url = f'https://docs.google.com/document/d/{doc_id}/export?format=txt'
    try:
        r = requests.get(url, timeout=15)
        if r.status_code != 200:
            return None
        text = r.content.decode('utf-8-sig', errors='replace').strip()
    except Exception:
        return None

    if len(text) < 50:
        return None

    return build_document_entry(name, text, doc_id)

def main():
    kb_path = Path('knowledge_base.json')
    if kb_path.exists():
        with open(kb_path, 'r', encoding='utf-8') as f:
            kb = json.load(f)
    else:
        kb = {'documents': [], 'chunks': [], 'total_docs': 0, 'total_chunks': 0}

    existing_canonical = {
        get_canonical_key(d['metadata'].get('title') or d['metadata'].get('original_filename', '')): d
        for d in kb.get('documents', [])
    }

    updated = False

    # 1. Escanear carpeta local Repo/ (archivos generados por GitHub Actions o sincronizados)
    repo_dir = Path('Repo')
    if repo_dir.exists():
        grouped_local = defaultdict(list)
        for f in repo_dir.glob('*'):
            if f.name.startswith('.') or f.name == 'desktop.ini':
                continue
            grouped_local[get_canonical_key(f.name)].append(f)

        for c_key, files in grouped_local.items():
            if c_key not in existing_canonical:
                # Priorizar .txt o .docx
                sorted_f = sorted(files, key=lambda p: 0 if p.suffix.lower() == '.docx' else 1)
                primary = sorted_f[0]
                text = ''
                for f in sorted_f:
                    if f.suffix.lower() == '.txt':
                        text = f.read_text(encoding='utf-8', errors='replace').strip()
                        if len(text) >= 50:
                            break
                    elif f.suffix.lower() == '.docx':
                        text = parse_local_docx(f)
                        if len(text) >= 50:
                            break
                if len(text) >= 50:
                    entry = build_document_entry(primary.name, text, '')
                    chunks = entry.pop('chunks')
                    kb['documents'].append(entry)
                    kb['chunks'].extend(chunks)
                    existing_canonical[c_key] = entry
                    updated = True
                    print(f"[OK] Nuevo artículo local en Repo/ indexado: {primary.name}")

    # 2. Procesar CLIENT_PAYLOAD enviado desde Google Drive Apps Script
    payload_str = os.environ.get('CLIENT_PAYLOAD', '{}')
    try:
        payload = json.loads(payload_str) if payload_str else {}
    except Exception:
        payload = {}

    files_list = payload.get('files', []) if isinstance(payload, dict) else []
    if files_list:
        print(f"Procesando {len(files_list)} archivos recibidos desde Google Drive...")
        for f_info in files_list:
            name = f_info.get('name', '')
            canonical_key = get_canonical_key(name)
            if canonical_key not in existing_canonical:
                processed = process_file_payload(f_info)
                if processed:
                    chunks = processed.pop('chunks')
                    kb['documents'].append(processed)
                    kb['chunks'].extend(chunks)
                    existing_canonical[canonical_key] = processed
                    updated = True
                    print(f"[OK] Nuevo artículo de Drive indexado: {name}")

    if updated:
        kb['total_docs'] = len(kb['documents'])
        kb['total_chunks'] = len(kb['chunks'])
        kb['last_sync_timestamp'] = time.time()
        kb['last_sync'] = time.strftime('%Y-%m-%d %H:%M:%S')

        with open('knowledge_base.json', 'w', encoding='utf-8') as f:
            json.dump(kb, f, ensure_ascii=False, indent=2)
        total_docs_val = kb['total_docs']
        print(f"knowledge_base.json actualizado con {total_docs_val} articulos unicos!")
    else:
        print("No hubo articulos nuevos para agregar.")

if __name__ == '__main__':
    main()
