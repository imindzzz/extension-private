const copyToClipboard = async (content: string) => {
  try {
    /**
     * 解决navigator.clipboard为undefined的问题
     * @see https://stackoverflow.com/questions/51805395/navigator-clipboard-is-undefined
     */
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = content;
      // make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      await new Promise<void>((res, rej) => {
        document.execCommand('copy') ? res() : rej();
        textArea.remove();
      });
    }
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

export default copyToClipboard;