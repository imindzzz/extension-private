const copyToClipboard = async (content: string): Promise<boolean> => {
  try {
    /**
     * 解决 navigator.clipboard 为 undefined 的问题（非安全上下文）
     * @see https://stackoverflow.com/questions/51805395/navigator-clipboard-is-undefined
     */
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.append(textArea);
    textArea.focus();
    textArea.select();
    try {
      return document.execCommand('copy');
    } finally {
      textArea.remove();
    }
  } catch (error) {
    console.error('Failed to copy: ', error);
    return false;
  }
};

export { copyToClipboard };
