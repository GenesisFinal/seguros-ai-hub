import os
import sys
import json
import re
import time
import requests
from pathlib import Path
from collections import defaultdict

PILARS = {
    '1': '1. T?cnico y Actuarial',
    '2': '2. Normativa SSN y Legal',
    '3': '3. Finanzas, Capital y Solvencia',
    '4': '4. Operaciones, Fraude e Insurtech',
    '5': '5. Liderazgo y Gesti?n de Talento'
}

def clean_spanish_string(text: str) -> str:
    if not text: return ""
    res = str(text)
    repls = [
        (r'T\?cnico', 'T?cnico'), (r't\?cnico', 't?cnico'),
        (r'T\?cnica', 'T?cnica'), (r't\?cnica', 't?cnica'),
        (r'Gesti\?n', 'Gesti?n'), (r'gesti\?n', 'gesti?n'),
        (r'Matem\?tica', 'Matem?tica'), (r'matem\?tica', 'matem?tica'),
        (r'Matem\?ticas', 'Matem?ticas'), (r'matem\?ticas', 'matem?ticas'),
        (r'M\?todo', 'M?todo'), (r'm\?todo', 'm?todo'),
        (r'Descomposici\?n', 'Descomposici?n'), (r'descomposici\?n', 'descomposici?n'),
        (r'Suscripci\?n', 'Suscripci?n'), (r'suscripci\?n', 'suscripci?n'),
        (r'Resoluci\?n', 'Resoluci?n'), (r'resoluci\?n', 'resoluci?n'),
        (r'Regulaci\?n', 'Regulaci?n'), (r'regulaci\?n', 'regulaci?n'),
        (r'Operaci\?n', 'Operaci?n'), (r'operaci\?n', 'operaci?n'),
        (r'Ambig\?edad', 'Ambig?edad'), (r'ambig\?edad', 'ambig?edad'),
        (r'Distribuci\?n', 'Distribuci?n'), (r'distribuci\?n', 'distribuci?n'),
        (r'Optimizaci\?n', 'Optimizaci?n'), (r'optimizaci\?n', 'optimizaci?n'),
        (r'Prevenci\?n', 'Prevenci?n'), (r'prevenci\?n', 'prevenci?n'),
        (r'Protecci\?n', 'Protecci?n'), (r'protecci\?n', 'protecci?n'),
        (r'Informaci\?n', 'Informaci?n'), (r'informaci\?n', 'informaci?n'),
        (r'Art\?culo', 'Art?culo'), (r'art\?culo', 'art?culo'),
        (r'Art\?culos', 'Art?culos'), (r'art\?culos', 'art?culos'),
        (r'L\?der', 'L?der'), (r'l\?der', 'l?der'),
        (r'L\?deres', 'L?deres'), (r'l\?deres', 'l?deres'),
        (r'Gu\?a', 'Gu?a'), (r'gu\?a', 'gu?a'),
        (r'Dise\?o', 'Dise?o'), (r'dise\?o', 'dise?o'),
        (r'A\?o', 'A?o'), (r'a\?o', 'a?o'),
        (r'Compa\?a', 'Compa??a'), (r'compa\?a', 'compa??a'),
        (r'Desaf\?o', 'Desaf?o'), (r'desaf\?o', 'desaf?o'),
        (r'Pol\?tica', 'Pol?tica'), (r'pol\?tica', 'pol?tica'),
        (r'B\?hlmann', 'B?hlmann'), (r'b\?hlmann', 'b?hlmann'),
        (r'Estrat\?gic[ao]', 'Estrat?gica'), (r'estrat\?gic[ao]', 'estrat?gica'),
        (r'Tarificaci\?n', 'Tarificaci?n'), (r'tarificaci\?n', 'tarificaci?n'),
        (r'P\?liza', 'P?liza'), (r'p\?liza', 'p?liza'),
        (r'C\?lculo', 'C?lculo'), (r'c\?lculo', 'c?lculo'),
        (r'Funci\?n', 'Funci?n'), (r'funci\?n', 'funci?n'),
        (r'L\?mite', 'L?mite'), (r'l\?mite', 'l?mite'),
        (r'\?rea', '?rea'), (r'\?REA', '?REA'),
        (r'\ufffd', '')
    ]
    for p, r in repls:
        res = re.sub(p, r, res)
    return res

def get_canonical_key(name: str) -> str:
    n = name.replace('Copia de ', '').strip()
    n = re.sub(r'\.(docx|gdoc|pdf|txt|md)$', '', n, flags=re.IGNORECASE)
    m = re.search(r'^(\d{4}-\d{2}-\d{2})', n)
    date_part = m.group(1) if m else 'sin-fecha'
    clean_text = re.sub(r'[^\w\s]', ' ', n.lower())
    clean_text = ' '.join(clean_text.split())
    return f"{date_part}____{clean_text}"

def classify_pilar(text, title):
    lower = (title + ' ' + text[:2000]).lower()
    if any(k in lower for k in ['ibnr', 'chain-ladder', 'bornhuetter', 'reserva matem?tica', 'reserva matematica', 'zillmer', 'hattendorff', 'lee-carter', 'buhlmann', 'b?hlmann', 'credibilidad', 'semi-markov', 'glm', 'experiencia actuarial', 'submortalidad', 'longevidad', 'reaseguro', 'tarificaci?n', 'tarificacion']):
        return PILARS['1']
    elif any(k in lower for k in ['resoluci?n ssn', 'resolucion ssn', 'res. ssn', 'ssn', 'niif 17', 'ifrs 17', 'csm', 'ley 17.418', 'ley 22.400', 'productores asesores', 'pas', 'reticencia', 'incontestabilidad', 'dep?sito de planes', 'deposito de planes', 'r?gimen de inversiones', 'regimen de inversiones', 'activos computables']):
        return PILARS['2']
    elif any(k in lower for k in ['combined ratio', 'embedded value', 'value of new business', 'vnb', 'raroc', 'wacc', 'dupont', 'presupuestaci?n', 'presupuestacion', 'costo de capital', 'balanced scorecard', 'cuadro de mando', 'porter', 'cinco fuerzas', 'alm', 'activos y pasivos']):
        return PILARS['3']
    elif any(k in lower for k in ['ia generativa', 'underwriting', 'modelos predictivos', 'fraude', 'stp', 'straight-through', 'open insurance', 'embedded insurance', 'seguros embebidos', 'wearables', 'ubi', 'telemetr?a', 'telemetria', 'kpis operativos', 'raci', 'priorizaci?n operativa', 'demandas concurrentes']):
        return PILARS['4']
    elif any(k in lower for k in ['liderar', 'mando medio', 'delegaci?n', 'delegacion', 'uno a uno', 'reuni?n uno', 'reunion uno', 'grow', 'lencioni', 'cinco disfunciones', 'desempe?o', 'desempeno', 'situacional', 'sucesi?n', 'sucesion', 'transformacional', 'persona clave', 'coaching', 'doble bucle', 'kotter']):
        return PILARS['5']
    return PILARS['1']

def classify_ramos(text):
    lower = text.lower()
    ramos = []
    if 'vida' in lower: ramos.append('Vida')
    if 'retiro' in lower or 'rentas' in lower: ramos.append('Retiro')
    if 'accidentes personales' in lower or ' ap ' in lower: ramos.append('Accidentes Personales')
    if 'salud' in lower: ramos.append('Salud')
    if 'automotores' in lower or 'autos' in lower or 'flotas' in lower: ramos.append('Automotores')
    if 'patrimoniales' in lower or 'cauc' in lower or 'incendio' in lower: ramos.append('Patrimoniales')
    return ramos if ramos else ['Personas / Integral']

def process_file_payload(file_info):
    name = file_info.get('name', 'Sin t?tulo')
    doc_id = file_info.get('id', '')
    if not doc_id:
        return None

    # Descargar texto de Google Doc
    url = f'https://docs.google.com/document/d/{doc_id}/export?format=txt'
    try:
        r = requests.get(url, timeout=15)
        if r.status_code != 200:
            return None
        text = r.content.decode('utf-8-sig', errors='replace').strip()
    except Exception as e:
        return None

    if len(text) < 50:
        return None

    clean_title = clean_spanish_string(name.replace('.gdoc', '').replace('.docx', '').replace('.pdf', '').replace('.txt', '').replace('Copia de ', '').strip())
    lines = [clean_spanish_string(l.strip()) for l in text.splitlines() if l.strip() and not l.strip().startswith('??') and not l.strip().startswith('--')]
    
    first_line = lines[0] if lines else clean_title
    if len(first_line) < 100 and not first_line.startswith('Fecha:'):
        doc_title = first_line
    else:
        doc_title = clean_title

    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', clean_title) or re.search(r'Fecha:\s*(\d{4}-\d{2}-\d{2})', text)
    doc_date = date_match.group(1) if date_match else 'Sin fecha'
    if doc_date != 'Sin fecha' and not doc_title.startswith(doc_date):
        doc_title = f'{doc_date} - {doc_title}'

    pilar = classify_pilar(text, doc_title)
    ramos = classify_ramos(text)

    summary_lines = [l for l in lines[1:] if len(l) > 30 and not l.startswith('Fecha:') and not l.startswith('?rea:') and not l.startswith('Area:')]
    summary = summary_lines[0] if summary_lines else text[:200]
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
            'download_docx_url': f'https://docs.google.com/document/d/{doc_id}/export?format=docx',
            'download_pdf_url': f'https://docs.google.com/document/d/{doc_id}/export?format=pdf',
            'download_txt_url': f'https://docs.google.com/document/d/{doc_id}/export?format=txt',
            'gdoc_url': f'https://docs.google.com/document/d/{doc_id}/edit'
        },
        'file_path': name,
        'total_chunks': len(chunks),
        'chunks': chunks,
        'content_preview': text[:500],
        'full_text': text
    }

def main():
    payload_str = os.environ.get('CLIENT_PAYLOAD', '{}')
    try:
        payload = json.loads(payload_str)
    except:
        payload = {}

    files_list = payload.get('files', [])
    print(f'Procesando {len(files_list)} archivos recibidos desde Google Drive...')

    kb_path = Path('knowledge_base.json')
    if kb_path.exists():
        with open(kb_path, 'r', encoding='utf-8') as f:
            kb = json.load(f)
    else:
        kb = {'documents': [], 'chunks': [], 'total_docs': 0, 'total_chunks': 0}

    # Mapa de claves can?nicas para evitar duplicar el mismo art?culo en formatos distintos
    existing_canonical = {get_canonical_key(d['metadata'].get('title') or d['metadata'].get('original_filename', '')): d for d in kb.get('documents', [])}
    
    updated = False
    for f_info in files_list:
        name = f_info.get('name', '')
        canonical_key = get_canonical_key(name)
        if canonical_key not in existing_canonical:
            print(f'-> Nuevo art?culo detectado: {name}')
            processed = process_file_payload(f_info)
            if processed:
                chunks = processed.pop('chunks')
                kb['documents'].append(processed)
                kb['chunks'].extend(chunks)
                existing_canonical[canonical_key] = processed
                updated = True
                print(f'   [OK] {name} indexado exitosamente!')

    if updated:
        kb['total_docs'] = len(kb['documents'])
        kb['total_chunks'] = len(kb['chunks'])
        kb['last_sync_timestamp'] = time.time()
        kb['last_sync'] = time.strftime('%Y-%m-%d %H:%M:%S')

        with open('knowledge_base.json', 'w', encoding='utf-8') as f:
            json.dump(kb, f, ensure_ascii=False, indent=2)
        print(f'knowledge_base.json actualizado con {kb[\"total_docs\"]} art?culos ?nicos!')
    else:
        print('No hubo art?culos nuevos para agregar.')

if __name__ == '__main__':
    main()
