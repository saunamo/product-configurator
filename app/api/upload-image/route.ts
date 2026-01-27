import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * POST /api/upload-image
 * Upload an image file to the server's public/images directory
 * Returns the URL path to the saved image
 * 
 * Note: On Netlify, the file system is read-only in serverless functions.
 * Images must be uploaded via Git/deployment, not through this API.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if we're on Netlify (read-only file system)
    const isNetlify = !!process.env.NETLIFY;
    
    if (isNetlify) {
      return NextResponse.json(
        {
          error: "Image uploads are not available on Netlify. Please upload images via Git and deploy, or use an external image hosting service (e.g., Cloudinary, Imgur). The file system is read-only in Netlify's serverless environment.",
          netlifyReadOnly: true,
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Ensure public/images directory exists
    const imagesDir = join(process.cwd(), "public", "images");
    if (!existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }

    // Save file
    const filePath = join(imagesDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the URL path (relative to public folder)
    const imageUrl = `/images/${filename}`;

    console.log(`✅ Image uploaded: ${filename} (${(file.size / 1024).toFixed(2)} KB)`);

    return NextResponse.json({
      success: true,
      url: imageUrl,
      filename: filename,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Failed to upload image:", error);
    
    // Check if it's a read-only file system error
    if (error.code === "EROFS" || error.message?.includes("read-only")) {
      return NextResponse.json(
        {
          error: "File system is read-only. On Netlify, images must be uploaded via Git and deployed. Please add the image to the public/images folder and commit it.",
          netlifyReadOnly: true,
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      {
        error: error.message || "Failed to upload image",
      },
      { status: 500 }
    );
  }
}
