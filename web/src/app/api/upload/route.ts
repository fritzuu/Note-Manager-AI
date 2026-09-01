import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const maxDuration = 60;

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || "6b250d068d041c08e866c64ce9ad2006";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Read file as Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if the file is an image
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);

    if (isImage) {
      try {
        const base64Data = buffer.toString("base64");

        const imgbbFormData = new FormData();
        imgbbFormData.append("image", base64Data);
        if (file.name) {
          imgbbFormData.append("name", file.name.replace(/\.[^/.]+$/, ""));
        }

        const imgbbResponse = await fetch(
          `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
          {
            method: "POST",
            body: imgbbFormData,
          }
        );

        const imgbbResult = await imgbbResponse.json();

        if (imgbbResponse.ok && imgbbResult.success && imgbbResult.data?.url) {
          const directUrl = imgbbResult.data.display_url || imgbbResult.data.url;
          return NextResponse.json({
            url: directUrl,
            name: file.name,
            size: file.size,
            type: file.type,
            provider: "imgbb",
            deleteUrl: imgbbResult.data.delete_url,
            thumbUrl: imgbbResult.data.thumb?.url,
          });
        } else {
          console.warn("ImgBB upload responded with error, using local fallback:", imgbbResult);
        }
      } catch (imgbbErr) {
        console.error("ImgBB upload network error, falling back to local:", imgbbErr);
      }
    }

    // Fallback or non-image files: save to public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${Date.now()}_${cleanName}`;
    const filePath = path.join(uploadDir, uniqueName);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/${uniqueName}`,
      name: file.name,
      size: file.size,
      type: file.type,
      provider: "local",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    );
  }
}
