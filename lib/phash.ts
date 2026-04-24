import imghash from 'imghash';
import sharp from 'sharp';

/**
 * Downloads an image and generates a perceptual hash (pHash) using imghash.
 * Uses sharp to standardize the image buffer before hashing if necessary.
 */
export async function getPHash(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image for hashing: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Optional: preprocess with sharp to ensure format compatibility (e.g., standardizing to jpeg/png)
  const standardizedBuffer = await sharp(buffer)
    .resize(256, 256, { fit: 'inside' })
    .jpeg()
    .toBuffer();

  const hash = await imghash.hash(standardizedBuffer);
  return hash;
}

/**
 * Calculates the Hamming distance between two hex strings.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  
  // Convert hex to binary strings of equal length
  const bin1 = hexToBinary(hash1);
  const bin2 = hexToBinary(hash2);
  
  const len = Math.max(bin1.length, bin2.length);
  const padded1 = bin1.padStart(len, '0');
  const padded2 = bin2.padStart(len, '0');

  for (let i = 0; i < len; i++) {
    if (padded1[i] !== padded2[i]) {
      distance++;
    }
  }

  return distance;
}

function hexToBinary(hex: string): string {
  let binary = '';
  for (let i = 0; i < hex.length; i++) {
    binary += parseInt(hex[i], 16).toString(2).padStart(4, '0');
  }
  return binary;
}
