/** The server keeps a 256 px square; twice that leaves it room to shrink cleanly. */
export const PICTURE_SIZE = 512

/** The centre square of a picture: where to cut from, and how big the square is. */
export function squareCrop(width: number, height: number): { x: number; y: number; side: number } {
  const side = Math.min(width, height)
  return { x: Math.round((width - side) / 2), y: Math.round((height - side) / 2), side }
}

/** Decodes the picture upright: phones keep a photo's rotation only in its metadata. */
async function decode(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file, { imageOrientation: 'from-image' })
  // older browsers: an <img> also applies the rotation, on its own
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Any picture the browser can open (HEIC and WebP included) as a centre-square JPEG, upright and at
 * most {@link PICTURE_SIZE} px. The server only takes JPEG, PNG or GIF, and drops the rotation.
 * Throws when the browser can't read it.
 */
export async function squareJpeg(file: Blob): Promise<Blob> {
  const picture = await decode(file)
  const { x, y, side } = squareCrop(picture.width, picture.height)
  const size = Math.min(side, PICTURE_SIZE)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no canvas')
  // a transparent PNG would turn black as a JPEG: paint it on white first
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size, size)
  context.drawImage(picture, x, y, side, side, 0, 0, size, size)
  if ('close' in picture && typeof picture.close === 'function') picture.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no picture'))), 'image/jpeg', 0.9),
  )
}
