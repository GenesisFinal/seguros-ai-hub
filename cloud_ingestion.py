import os
import sys
import json
import re
import time
import requests
from pathlib import Path

PILARS = {
    '1': '1. T?cnico y Actuarial',
    '2': '2. Normativa SSN y Legal',
    '3': '3. Finanzas, Capital y Solvencia',
    '4': '4. Operaciones, Fraude e Insurtech',
    '5': '5. Liderazgo y Gesti?n de Talento'
}

def classify_pilar(text, title):
    lower = (title + ' ' + text[:2000]).lower()
    if any(k in lower for k in ['ibnr', 'chain-ladder', 'bornhuetter', 'reserva matem?tica', 'zillmer', 'hattendorff', 'lee-carter', 'buhlmann', 'b?hlmann', 'credibilidad', 'semi-markov', 'glm', 'experiencia actuarial', 'submortalidad', 'longevidad', 'reaseguro', 'tarificaci?n', 'tarificacion', 'matematica']):
        return PILARS['1']
    elif any(k in lower for k in ['resoluci?n ssn', 'res. ssn', 'ssn', 'niif 17', 'ifrs 17', 'csm', 'ley 17.418', 'ley 22.400', 'productores asesores', 'pas', 'reticencia', 'incontestabilidad', 'dep?sito de planes', 'r?gimen de inversiones', 'activos computables']):
        return PILARS['2']
    elif any(k in lower for k in ['combined ratio', 'embedded value', 'value of new business', 'vnb', 'raroc', 'wacc', 'dupont', 'presupuestaci?n', 'costo de capital', 'balanced scorecard', 'cuadro de mando', 'porter', 'cinco fuerzas']):
        return PILARS['3']
    elif any(k in lower for k in ['ia generativa', 'underwriting', 'modelos predictivos', 'fraude', 'stp', 'straight-through', 'open insurance', 'embedded insurance', 'seguros embebidos', 'wearables', 'ubi', 'telemetr?a', 'kpis operativos', 'raci', 'priorizaci?n operativa', 'demandas concurrentes']):
        return PILARS['4']
    elif any(k in lower for k in ['liderar', 'mando medio', 'delegaci?n', 'uno a uno', 'reuni?n uno', 'grow', 'lencioni', 'cinco disfunciones', 'desempe?o', 'situacional', 'sucesi?n', 'transformacional', 'persona clave', 'coaching']):
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
    if 'patrimoniales' in lower or 'cauci?n' in lower or 'incendio' in lower: ramos.append('Patrimoniales')
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
            print(f'Error descargando {name}: HTTP {r.status_code}')
            return None
        text = r.content.decode('utf-8-sig', errors='replace').strip()
    except Exception as e:
        print(f'Excepci?n descargando {name}: {e}')
        return None

    if len(text) < 50:
        return None

    # Limpiar t?tulo
    clean_title = name.replace('.gdoc', '').replace('Copia de ', '').strip()
    lines = [l.strip() for l in text.splitlines() if l.strip() and not l.strip().startswith('??') and not l.strip().startswith('--')]
    
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

    summary_lines = [l for l in lines[1:] if len(l) > 30 and not l.startswith('Fecha:') and not l.startswith('?rea:')]
    summary = summary_lines[0] if summary_lines else text[:200]
    if len(summary) > 230:
        summary = summary[:227] + '...'

    # Chunks
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
            'original_ext': '.gdoc',
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

    existing_docs = {d['metadata'].get('doc_id') or d['metadata'].get('original_filename'): d for d in kb.get('documents', [])}
    
    updated = False
    for f_info in files_list:
        doc_id = f_info.get('id')
        name = f_info.get('name')
        key = doc_id or name
        if key not in existing_docs:
            print(f'-> Nuevo archivo detectado: {name} (ID: {doc_id})')
            processed = process_file_payload(f_info)
            if processed:
                chunks = processed.pop('chunks')
                kb['documents'].append(processed)
                kb['chunks'].extend(chunks)
                existing_docs[key] = processed
                updated = True
                print(f'   [OK] {name} indexado exitosamente!')

    if updated:
        kb['total_docs'] = len(kb['documents'])
        kb['total_chunks'] = len(kb['chunks'])
        kb['last_sync_timestamp'] = time.time()
        kb['last_sync'] = time.strftime('%Y-%m-%d %H:%M:%S')

        with open('knowledge_base.json', 'w', encoding='utf-8') as f:
            json.dump(kb, f, ensure_ascii=False, indent=2)
        print(f'knowledge_base.json actualizado exitosamente con {kb["total_docs"]} documentos!')
    else:
        print('No hubo documentos nuevos para agregar. Base de datos al d?a.')

if __name__ == '__main__':
    main()
