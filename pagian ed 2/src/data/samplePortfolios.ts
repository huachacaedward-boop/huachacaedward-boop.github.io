import { PortfolioMeta, PortfolioPage } from '../types';
import { generateSamplePageImages } from '../services/imageDetector';

function createSvgPageDataUrl(
  pageNumber: number,
  totalPages: number,
  title: string,
  subtitle: string,
  category: string,
  contentConfig: {
    theme: 'dark' | 'light' | 'editorial' | 'warm';
    headline: string;
    body: string;
    accentColor: string;
    imageUrl?: string;
    type: 'cover' | 'index' | 'project' | 'gallery' | 'specs' | 'backcover';
  }
): string {
  const width = 1200;
  const height = 1600;

  const isCover = contentConfig.type === 'cover';
  const isBack = contentConfig.type === 'backcover';

  let bg = '#FAFAF9';
  let textColor = '#1C1917';
  let mutedColor = '#78716C';
  let borderCol = '#E7E5E4';

  if (contentConfig.theme === 'dark') {
    bg = '#121214';
    textColor = '#F4F4F5';
    mutedColor = '#A1A1AA';
    borderCol = '#27272A';
  } else if (contentConfig.theme === 'editorial') {
    bg = '#F5F2EB';
    textColor = '#1F1E1D';
    mutedColor = '#6E6B65';
    borderCol = '#DCD6C9';
  } else if (contentConfig.theme === 'warm') {
    bg = '#FDFBF7';
    textColor = '#292524';
    mutedColor = '#857F79';
    borderCol = '#EBE5DC';
  }

  let contentSvg = '';

  if (isCover) {
    contentSvg = `
      <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}"/>
      <rect x="60" y="60" width="${width - 120}" height="${height - 120}" fill="none" stroke="${contentConfig.accentColor}" stroke-width="2" opacity="0.4"/>
      
      <!-- Cover Decorative Header -->
      <text x="120" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" letter-spacing="6" fill="${contentConfig.accentColor}">${category.toUpperCase()}</text>
      <text x="${width - 120}" y="180" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500" letter-spacing="3" fill="${mutedColor}">EDICIÓN 2026</text>
      
      <!-- Big Title -->
      <text x="120" y="420" font-family="Georgia, serif" font-size="72" font-weight="700" fill="${textColor}">${title}</text>
      <text x="120" y="480" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="300" fill="${mutedColor}">${subtitle}</text>

      <!-- Center Visual Element -->
      <g transform="translate(120, 560)">
        <rect x="0" y="0" width="${width - 240}" height="640" rx="12" fill="${contentConfig.accentColor}" opacity="0.12"/>
        <circle cx="${(width - 240) / 2}" cy="320" r="180" fill="none" stroke="${contentConfig.accentColor}" stroke-width="3" stroke-dasharray="8 6"/>
        <circle cx="${(width - 240) / 2}" cy="320" r="120" fill="${contentConfig.accentColor}" opacity="0.2"/>
        <text x="${(width - 240) / 2}" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="600" fill="${textColor}">${contentConfig.headline}</text>
        <text x="${(width - 240) / 2}" y="365" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="${mutedColor}">${contentConfig.body}</text>
      </g>

      <!-- Bottom Info -->
      <line x1="120" y1="1340" x2="${width - 120}" y2="1340" stroke="${borderCol}" stroke-width="1.5"/>
      <text x="120" y="1420" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="${textColor}">PORTAFOLIO PROFESIONAL</text>
      <text x="120" y="1455" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="${mutedColor}">Documento Certificado de Alta Fidelidad</text>
      <text x="${width - 120}" y="1440" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="${contentConfig.accentColor}">FOLIOFLIP</text>
    `;
  } else if (isBack) {
    contentSvg = `
      <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}"/>
      <g transform="translate(120, 400)">
        <rect x="0" y="0" width="${width - 240}" height="700" rx="16" fill="${contentConfig.accentColor}" opacity="0.08"/>
        <circle cx="${(width - 240) / 2}" cy="180" r="60" fill="${contentConfig.accentColor}" opacity="0.3"/>
        <text x="${(width - 240) / 2}" y="195" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="700" fill="${contentConfig.accentColor}">✦</text>
        
        <text x="${(width - 240) / 2}" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="46" font-weight="700" fill="${textColor}">${contentConfig.headline}</text>
        <text x="${(width - 240) / 2}" y="380" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="${mutedColor}">Gracias por explorar este portafolio.</text>
        <text x="${(width - 240) / 2}" y="440" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500" fill="${textColor}">${contentConfig.body}</text>
        
        <rect x="${(width - 240) / 2 - 120}" y="520" width="240" height="50" rx="25" fill="${contentConfig.accentColor}" opacity="0.2"/>
        <text x="${(width - 240) / 2}" y="552" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="${contentConfig.accentColor}">CONTACTO & DISPONIBILIDAD</text>
      </g>
      <text x="${width / 2}" y="${height - 100}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="${mutedColor}">Diseñado y publicado con FolioFlip Ultra HD</text>
    `;
  } else {
    // Standard Editorial Page
    contentSvg = `
      <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}"/>
      
      <!-- Running Header -->
      <text x="100" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" letter-spacing="2" fill="${mutedColor}">${title.toUpperCase()}</text>
      <text x="${width - 100}" y="90" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="500" fill="${mutedColor}">${category.toUpperCase()}</text>
      <line x1="100" y1="120" x2="${width - 100}" y2="120" stroke="${borderCol}" stroke-width="1"/>

      <!-- Section Tag -->
      <rect x="100" y="170" width="130" height="32" rx="6" fill="${contentConfig.accentColor}" opacity="0.15"/>
      <text x="165" y="192" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="${contentConfig.accentColor}">PROYECTO 0${pageNumber}</text>

      <!-- Headline & Story -->
      <text x="100" y="270" font-family="Georgia, serif" font-size="44" font-weight="700" fill="${textColor}">${contentConfig.headline}</text>
      
      <g transform="translate(100, 320)">
        <rect x="0" y="0" width="${width - 200}" height="480" rx="12" fill="${contentConfig.accentColor}" opacity="0.12"/>
        <line x1="0" y1="0" x2="${width - 200}" y2="480" stroke="${contentConfig.accentColor}" stroke-width="1.5" opacity="0.15"/>
        <line x1="${width - 200}" y1="0" x2="0" y2="480" stroke="${contentConfig.accentColor}" stroke-width="1.5" opacity="0.15"/>
        
        <circle cx="${(width - 200) / 2}" cy="240" r="90" fill="${bg}" stroke="${contentConfig.accentColor}" stroke-width="2"/>
        <text x="${(width - 200) / 2}" y="248" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" fill="${contentConfig.accentColor}">HD VISUAL</text>
        <text x="${(width - 200) / 2}" y="280" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${mutedColor}">Alta Definición 300 DPI</text>
      </g>

      <!-- Descriptive Text Two Columns -->
      <g transform="translate(100, 850)">
        <text x="0" y="30" font-family="Georgia, serif" font-size="24" font-weight="600" fill="${textColor}">Concepto & Ejecución</text>
        <text x="0" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="${textColor}" opacity="0.9">${contentConfig.body}</text>
        <text x="0" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="${mutedColor}">Desarrollo integral con enfoque holístico en experiencia, geometría y funcionalidad espacial.</text>
        <text x="0" y="135" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="${mutedColor}">Materiales de máxima durabilidad y sostenibilidad ambiental certificada.</text>
      </g>

      <!-- Technical Meta Grid -->
      <g transform="translate(100, 1050)">
        <rect x="0" y="0" width="${width - 200}" height="140" rx="8" fill="${contentConfig.accentColor}" opacity="0.06"/>
        
        <text x="30" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="${mutedColor}">CLIENTE</text>
        <text x="30" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${textColor}">Grupo Vanguardia</text>

        <text x="280" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="${mutedColor}">AÑO</text>
        <text x="280" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${textColor}">2025 - 2026</text>

        <text x="500" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="${mutedColor}">UBICACIÓN</text>
        <text x="500" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${textColor}">Metrópoli Central</text>

        <text x="750" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="${mutedColor}">ESTADO</text>
        <text x="750" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${contentConfig.accentColor}">Finalizado ✓</text>
      </g>

      <g transform="translate(100, 1240)">
        <rect x="0" y="0" width="${(width - 230) / 2}" height="180" rx="8" fill="${contentConfig.accentColor}" opacity="0.08"/>
        <text x="24" y="40" font-family="Georgia, serif" font-size="18" font-weight="700" fill="${textColor}">Detalle de Composición</text>
        <text x="24" y="75" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${mutedColor}">Estudio meticuloso de luces y sombras</text>
        <text x="24" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${mutedColor}">envolventes en toda la perspectiva.</text>

        <rect x="${(width - 230) / 2 + 30}" y="0" width="${(width - 230) / 2}" height="180" rx="8" fill="${contentConfig.accentColor}" opacity="0.08"/>
        <text x="${(width - 230) / 2 + 54}" y="40" font-family="Georgia, serif" font-size="18" font-weight="700" fill="${textColor}">Innovación Técnica</text>
        <text x="${(width - 230) / 2 + 54}" y="75" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${mutedColor}">Procesos paramétricos avanzados con</text>
        <text x="${(width - 230) / 2 + 54}" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${mutedColor}">reducción de huella de carbono.</text>
      </g>

      <!-- Running Footer & Page Number -->
      <line x1="100" y1="1490" x2="${width - 100}" y2="1490" stroke="${borderCol}" stroke-width="1"/>
      <text x="100" y="1530" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${mutedColor}">FolioFlip • Portafolio Editorial</text>
      <text x="${width - 100}" y="1530" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="${textColor}">${pageNumber} / ${totalPages}</text>
    `;
  }

  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${contentSvg}
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg.trim())}`;
}

export function generateSamplePortfolios(): PortfolioMeta[] {
  // Sample 1: Arquitectura
  const archPagesCount = 12;
  const archPages: PortfolioPage[] = [];
  const archProjects = [
    { name: 'Pabellón de Cristal & Madera', desc: 'Estructura ligera integrada en entorno forestal protegido.' },
    { name: 'Torre Biomórfica Norte', desc: 'Edificio corporativo con fachada bioclimática autoregulable.' },
    { name: 'Residencia Horizonte', desc: 'Vivienda unifamiliar con voladizos escultóricos sobre acantilado.' },
    { name: 'Centro Cultural Ágora', desc: 'Espacio público multifuncional con acústica de precisión.' },
    { name: 'Museo de Escultura Moderna', desc: 'Galerías iluminadas por linternas cenitales indirectas.' },
    { name: 'Biblioteca Central Mirador', desc: 'Integración paisajística con cubiertas ajardinadas transitables.' },
    { name: 'Loft Industrial Renovado', desc: 'Rehabilitación patrimonial preservando texturas originales.' },
    { name: 'Plaza Botánica Flotante', desc: 'Sistema de terrazas escalonadas con jardines de lluvia.' },
    { name: 'Villa Serena Mediterránea', desc: 'Muros de piedra caliza y patios interiores con fuentes de agua.' },
    { name: 'Observatorio Astronómico', desc: 'Cúpula geodésica con materiales aislantes de alta eficiencia.' },
  ];

  for (let i = 1; i <= archPagesCount; i++) {
    let type: 'cover' | 'index' | 'project' | 'gallery' | 'specs' | 'backcover' = 'project';
    let headline = '';
    let body = '';

    if (i === 1) {
      type = 'cover';
      headline = 'ARQUITECTURA & ESPACIO';
      body = 'Obras selectas y proyectos de autor 2020-2026';
    } else if (i === archPagesCount) {
      type = 'backcover';
      headline = 'STUDIO MONOLITO';
      body = 'contacto@studiomonolito.com • +34 912 345 678';
    } else {
      const proj = archProjects[i - 2] || { name: `Proyecto Arquitectónico ${i}`, desc: 'Estudio de diseño y constructibilidad avanzada.' };
      headline = proj.name;
      body = proj.desc;
    }

    const dataUrl = createSvgPageDataUrl(
      i,
      archPagesCount,
      'Studio Monolito',
      'Arquitectura & Urbanismo Sostenible',
      'Arquitectura',
      {
        theme: 'editorial',
        headline,
        body,
        accentColor: '#B45309', // Amber warm
        type,
      }
    );

    archPages.push({
      pageNumber: i,
      dataUrl,
      thumbnailUrl: dataUrl,
      width: 1200,
      height: 1600,
      aspectRatio: 1200 / 1600,
      extractedImages: generateSamplePageImages(dataUrl, i, 'arquitectura'),
    });
  }

  // Sample 2: Fotografía Editorial & Arte
  const photoPagesCount = 10;
  const photoPages: PortfolioPage[] = [];
  const photoSeries = [
    { name: 'Luz y Penumbra en Tokio', desc: 'Exploración nocturna en 35mm con emulsión de alto contraste.' },
    { name: 'Retratos de Vanguardia', desc: 'Sesión de moda editorial para portada de revista internacional.' },
    { name: 'Geometría Efímera', desc: 'Minimalismo y sombras cinéticas en arquitectura brutalista.' },
    { name: 'Tierras Altas de Islandia', desc: 'Paisajes volcánicos capturados en gran formato analógico.' },
    { name: 'Naturaleza en Silencio', desc: 'Botánica macroscópica con iluminación natural difusa.' },
    { name: 'Crónicas Urbanas', desc: 'Reportaje documental en las calles de Lisboa y Berlín.' },
    { name: 'Cuerpos en Movimiento', desc: 'Estudio de danza contemporánea en estudio con luz continua.' },
    { name: 'Texturas del Desierto', desc: 'Dunas infinitas y patrones de viento al atardecer.' },
  ];

  for (let i = 1; i <= photoPagesCount; i++) {
    let type: 'cover' | 'index' | 'project' | 'gallery' | 'specs' | 'backcover' = 'project';
    let headline = '';
    let body = '';

    if (i === 1) {
      type = 'cover';
      headline = 'LUMINA & SOMBRA';
      body = 'Fotografía de Autor & Dirección Creativa';
    } else if (i === photoPagesCount) {
      type = 'backcover';
      headline = 'ELENA ROSTOVA';
      body = 'elena@luminavisuals.art • Instagram @elenarostova_photo';
    } else {
      const s = photoSeries[i - 2] || { name: `Serie Fotográfica ${i}`, desc: 'Captura en película de medio formato.' };
      headline = s.name;
      body = s.desc;
    }

    const dataUrl = createSvgPageDataUrl(
      i,
      photoPagesCount,
      'Elena Rostova',
      'Dirección de Arte & Fotografía',
      'Fotografía',
      {
        theme: 'dark',
        headline,
        body,
        accentColor: '#06B6D4', // Cyan electric
        type,
      }
    );

    photoPages.push({
      pageNumber: i,
      dataUrl,
      thumbnailUrl: dataUrl,
      width: 1200,
      height: 1600,
      aspectRatio: 1200 / 1600,
      extractedImages: generateSamplePageImages(dataUrl, i, 'fotografia'),
    });
  }

  // Sample 3: UI/UX & Producto Digital
  const uxPagesCount = 14;
  const uxPages: PortfolioPage[] = [];
  const uxProjects = [
    { name: 'Fintech Aurora Mobile', desc: 'App bancaria con microinteracciones y diseño financiero accesible.' },
    { name: 'Krona Design System', desc: 'Sistema de diseño multiplataforma con más de 120 componentes.' },
    { name: 'AeroCloud Analytics', desc: 'Dashboard de visualización de datos en tiempo real con WebGL.' },
    { name: 'Pulse Health Wearable', desc: 'Experiencia integral para monitoreo biométrico continuo.' },
    { name: 'Orbit Workspace Suite', desc: 'Herramienta colaborativa para equipos de ingeniería remota.' },
    { name: 'EcoTransit Mobility', desc: 'Plataforma de micromovilidad y rutas urbanas intermodales.' },
    { name: 'Zenith Crypto Exchange', desc: 'Terminal de trading con latencia ultra-baja y modo pro.' },
    { name: 'Muse AI Studio', desc: 'Editor generativo de audio e instrumentos musicales con IA.' },
    { name: 'Vortex VR Navigation', desc: 'Interfaces espaciales inmersivas para computación espacial.' },
    { name: 'HyperFlow CRM', desc: 'Automatización de pipelines comerciales y métricas predictivas.' },
    { name: 'Terra Smart Home', desc: 'Control domótico unificado por voz y gestos hápticos.' },
    { name: 'Nexus Knowledge Base', desc: 'Buscador semántico y grafo de conocimiento corporativo.' },
  ];

  for (let i = 1; i <= uxPagesCount; i++) {
    let type: 'cover' | 'index' | 'project' | 'gallery' | 'specs' | 'backcover' = 'project';
    let headline = '';
    let body = '';

    if (i === 1) {
      type = 'cover';
      headline = 'VOXEL PRODUCT DESIGN';
      body = 'Casos de estudio y sistemas de diseño digital 2026';
    } else if (i === uxPagesCount) {
      type = 'backcover';
      headline = 'VOXEL STUDIO';
      body = 'hello@voxeldesign.io • Dribbble @voxelstudio';
    } else {
      const p = uxProjects[i - 2] || { name: `Caso de Estudio ${i}`, desc: 'Investigación de usuarios y prototipado.' };
      headline = p.name;
      body = p.desc;
    }

    const dataUrl = createSvgPageDataUrl(
      i,
      uxPagesCount,
      'Voxel Studio',
      'Diseño de Producto & Sistemas UI',
      'Diseño UI/UX',
      {
        theme: 'warm',
        headline,
        body,
        accentColor: '#4F46E5', // Indigo modern
        type,
      }
    );

    uxPages.push({
      pageNumber: i,
      dataUrl,
      thumbnailUrl: dataUrl,
      width: 1200,
      height: 1600,
      aspectRatio: 1200 / 1600,
      extractedImages: generateSamplePageImages(dataUrl, i, 'diseno'),
    });
  }

  return [
    {
      id: 'sample_arch_2026',
      title: 'Studio Monolito — Arquitectura & Espacios 2026',
      author: 'Arq. Mateo Arriaga & Asoc.',
      description: 'Portafolio editorial con proyectos arquitectónicos destacados, planimetrías y memorias conceptuales.',
      category: 'arquitectura',
      totalPages: archPagesCount,
      fileSizeBytes: 18450000,
      fileSizeFormatted: '17.6 MB',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
      coverImage: archPages[0].dataUrl,
      pages: archPages,
      isSample: true,
    },
    {
      id: 'sample_photo_2026',
      title: 'Lumina Visuals — Fotografía Editorial & Arte',
      author: 'Elena Rostova',
      description: 'Libro de fotografía artística de alta resolución, moda internacional y ensayos fotográficos en película.',
      category: 'fotografia',
      totalPages: photoPagesCount,
      fileSizeBytes: 34200000,
      fileSizeFormatted: '32.6 MB',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
      coverImage: photoPages[0].dataUrl,
      pages: photoPages,
      isSample: true,
    },
    {
      id: 'sample_ux_2026',
      title: 'Voxel Design — Sistemas de Producto & UI/UX',
      author: 'Voxel Studio Global',
      description: 'Compendio de sistemas de diseño, aplicaciones móviles y casos de estudio de producto digital.',
      category: 'diseno',
      totalPages: uxPagesCount,
      fileSizeBytes: 22100000,
      fileSizeFormatted: '21.1 MB',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
      coverImage: uxPages[0].dataUrl,
      pages: uxPages,
      isSample: true,
    },
  ];
}
