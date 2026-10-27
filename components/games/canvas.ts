const MAX_DPR = 2;

export function setupResponsiveCanvas(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  onResize?: (rect: DOMRectReadOnly) => void,
): () => void {
  let pixelWidth = 0;
  let pixelHeight = 0;

  function resizeCanvasToContainer() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const rect = container.getBoundingClientRect();
    const newWidth = Math.max(1, Math.round(rect.width * dpr));
    const newHeight = Math.max(1, Math.round(rect.height * dpr));
    if (newWidth !== pixelWidth || newHeight !== pixelHeight) {
      pixelWidth = newWidth;
      pixelHeight = newHeight;
      canvas.width = newWidth;
      canvas.height = newHeight;
    }
    onResize?.(rect);
  }

  resizeCanvasToContainer();
  const resizeObserver = new ResizeObserver(resizeCanvasToContainer);
  resizeObserver.observe(container);

  return () => {
    resizeObserver.disconnect();
  };
}
