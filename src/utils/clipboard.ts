/**
 * Safe clipboard copy utility that handles unfocused documents, iframes,
 * WebViews, and unsupported browsers without throwing unhandled exceptions.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Clipboard API if document is focused
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback silently if document is not focused or clipboard permission denied
    }
  }

  // 2. Robust DOM Fallback via hidden textarea & execCommand
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // Prevent scrolling / viewport jump
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      
      textArea.select();
      textArea.setSelectionRange(0, 99999); // For mobile devices

      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (cmdErr) {
        success = false;
      }

      document.body.removeChild(textArea);
      return success;
    } catch (domErr) {
      return false;
    }
  }

  return false;
}
