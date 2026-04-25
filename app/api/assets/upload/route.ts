import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: No userId provided' }, { status: 401 });
    }

    const buffer = await file.arrayBuffer();
    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'deeptrace-assets' },
        (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(Buffer.from(buffer));
    });

    return NextResponse.json({ 
      url: result.secure_url, 
      publicId: result.public_id 
    });

  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
