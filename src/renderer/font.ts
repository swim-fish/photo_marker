/** Load the same packaged typeface in the window and dedicated render worker. */
let loading: Promise<void> | undefined;
export function ensureEditorFont(): Promise<void> {
  if (typeof FontFace !== 'function') return Promise.resolve();
  const scope = globalThis as typeof globalThis & { fonts?: FontFaceSet };
  const fonts = typeof document !== 'undefined' ? document.fonts : scope.fonts;
  if (!fonts) return Promise.resolve();
  return (loading ??= (async () => {
    const face = new FontFace(
      'Noto Sans TC',
      `url(${import.meta.env.BASE_URL}fonts/noto-sans-tc-chinese-traditional-400-normal.woff2)`,
    );
    await face.load();
    fonts.add(face);
  })().catch((error) => {
    loading = undefined;
    throw error;
  }));
}
