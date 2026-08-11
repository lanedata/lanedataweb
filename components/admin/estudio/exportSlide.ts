// Exportador PNG del Estudio IG. La lógica vive en components/admin/exportNode.ts,
// compartida con el generador de Historias (1080×1920).

import { nodeToPng } from '../exportNode'
import { SLIDE_H, SLIDE_W } from './SlideCanvas'

/** Renderiza el nodo de una diapositiva (1080×1350, estilos inline) a PNG data URL. */
export async function slideToPng(node: HTMLElement): Promise<string> {
  return nodeToPng(node, SLIDE_W, SLIDE_H)
}
