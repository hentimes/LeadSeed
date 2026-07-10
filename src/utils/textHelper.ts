export function insertTextAtCursor(
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  currentValue: string,
  textToInsert: string,
  setValue: (val: string) => void
) {
  const input = inputRef.current;
  if (!input) {
    setValue(currentValue + (currentValue && !currentValue.endsWith(' ') ? ' ' : '') + textToInsert);
    return;
  }
  
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  
  const newValue = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);
  setValue(newValue);
  
  setTimeout(() => {
    input.focus();
    input.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
  }, 0);
}
