/**
 * Utilitário seguro para cópia na área de transferência com fallback
 * Funciona tanto com Clipboard API (HTTPS) quanto com fallback de textarea
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API direta falhou, utilizando fallback:', err);
  }

  // Fallback universal compatível com todos os navegadores
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Falha no fallback de cópia:', err);
    return false;
  }
}

/**
 * Extrai e padroniza a identificação da casa para as mensagens
 * Ex: "426" -> "426", "Casa 426" -> "426", "Apto 12" -> "Apto 12"
 */
export function formatarNumeroCasa(casa: string): string {
  if (!casa) return '';
  const trimmed = String(casa).trim();
  const cleaned = trimmed.replace(/^casa\s*:?\s*/i, '').trim();
  return cleaned || trimmed;
}

/**
 * Formata a mensagem padrão de RETIRADA / ENTREGA de prisma para cópia automática
 * Formato obrigatório: CASA 426 RETIROU PRISMA 11 (AMARELO).
 */
export function formatMensagemEntrega(numero: string, corNome: string, casa: string): string {
  const num = String(numero || '').trim();
  const cor = (corNome || '').trim().toUpperCase();
  const casaLimpa = formatarNumeroCasa(casa);
  return `CASA ${casaLimpa} RETIROU PRISMA ${num} (${cor}).`;
}

/**
 * Formata a mensagem padrão de DEVOLUÇÃO / RECOLHIMENTO de prisma para cópia automática
 * Formato obrigatório: CASA 426 ENTREGOU PRISMA 11 (AMARELO).
 */
export function formatMensagemRecolhimento(numero: string, corNome: string, casa: string): string {
  const num = String(numero || '').trim();
  const cor = (corNome || '').trim().toUpperCase();
  const casaLimpa = formatarNumeroCasa(casa);
  return `CASA ${casaLimpa} ENTREGOU PRISMA ${num} (${cor}).`;
}

