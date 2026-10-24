import * as pdfjsLib from 'pdfjs-dist';

// Usamos el worker de pdf.js servido desde un CDN, así no hay que configurar
// Vite para empaquetar el archivo del worker por separado.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Extrae el texto de un PDF (informe de métricas, etc.) directamente en el
// navegador — no sube el archivo a ningún servidor ni usa IA externa.
// Funciona bien con PDFs que tienen texto real (la mayoría de exportaciones
// de Instagram/Meta, reportes armados en Google Docs, etc.). Si el PDF es
// una imagen escaneada sin texto, esto devuelve muy poco o nada.
export async function extraerTextoPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let texto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const textoPagina = content.items.map(it => it.str).join(' ');
    texto += `--- Página ${i} ---\n${textoPagina}\n\n`;
  }
  return texto.trim();
}
