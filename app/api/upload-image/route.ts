import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * POST /api/upload-image
 * Upload an image file to the server's public/images directory
 * Returns the URL path to the saved image
 */
export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json(
      {
        error: error.message || "Failed to upload image",
      },
      { status: 500 }
    );
  }
}
