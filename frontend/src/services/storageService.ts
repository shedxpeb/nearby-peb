import { Platform } from "react-native";
import { API_BASE_URL, sessionStorage } from "./api";

export type UploadedFile = { path: string; url: string };

async function fileUrl(path: string): Promise<string> {
  const token = (await sessionStorage.read()) ?? "";
  return `${API_BASE_URL}/api/storage/files/${path}?token=${encodeURIComponent(token)}`;
}

export const storageService = {
  fileUrl,

  async upload(uri: string, name = "photo.jpg", type = "image/jpeg"): Promise<UploadedFile> {
    const token = (await sessionStorage.read()) ?? "";
    const form = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(uri)).blob();
      form.append("file", blob, name);
    } else {
      form.append("file", { uri, name, type } as any);
    }
    const response = await fetch(`${API_BASE_URL}/api/storage/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) {
      const error = body?.error ?? body?.detail ?? {};
      throw new Error(error.message ?? "Upload failed. Please try again.");
    }
    return { path: body.data.path, url: await fileUrl(body.data.path) };
  },
};
