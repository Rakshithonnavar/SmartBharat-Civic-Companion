/**
 * Uploads a complaint photo directly from the browser to Cloudinary,
 * using an unsigned upload preset. The backend never receives raw
 * image bytes — it only ever stores the resulting URL string. This
 * keeps Render's ephemeral free-tier filesystem out of the picture
 * entirely (anything saved to local disk there is wiped on every
 * restart/redeploy), and avoids adding multipart-handling, storage,
 * or bandwidth concerns to the API server.
 *
 * Requires two env vars (frontend/.env):
 *   REACT_APP_CLOUDINARY_CLOUD_NAME
 *   REACT_APP_CLOUDINARY_UPLOAD_PRESET   (must be an UNSIGNED preset)
 */

export const MAX_PHOTOS = 3;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

/**
 * Validates a File before attempting upload. Returns an error message
 * (in the given language) or null if the file is acceptable. Client-side
 * validation is purely for fast feedback — the real enforcement lives in
 * the Cloudinary upload preset's own format/size restrictions, which
 * can't be bypassed by tampering with client code.
 */
export function validatePhotoFile(file, lang = "en") {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return lang === "hi"
      ? "केवल JPG, PNG या WEBP फ़ोटो स्वीकार की जाती हैं।"
      : "Only JPG, PNG, or WEBP photos are accepted.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return lang === "hi"
      ? "फ़ोटो का आकार 5MB से कम होना चाहिए।"
      : "Photo must be smaller than 5MB.";
  }
  return null;
}

/**
 * Uploads a single validated File to Cloudinary. Resolves with the
 * permanent secure URL, or throws with a user-facing message.
 */
export async function uploadPhotoToCloudinary(file, lang = "en") {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      lang === "hi"
        ? "फ़ोटो अपलोड अभी कॉन्फ़िगर नहीं है।"
        : "Photo upload isn't configured yet."
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  // Keeps complaint photos organized and easy to find/manage in the
  // Cloudinary media library, separate from any other assets.
  formData.append("folder", "smart_bharat_complaints");

  let response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
  } catch {
    throw new Error(
      lang === "hi"
        ? "अपलोड विफल — कृपया अपना कनेक्शन जाँचें।"
        : "Upload failed — please check your connection."
    );
  }

  if (!response.ok) {
    throw new Error(
      lang === "hi"
        ? "फ़ोटो अपलोड नहीं हो सकी। कृपया पुनः प्रयास करें।"
        : "Photo could not be uploaded. Please try again."
    );
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error(
      lang === "hi"
        ? "फ़ोटो अपलोड नहीं हो सकी। कृपया पुनः प्रयास करें।"
        : "Photo could not be uploaded. Please try again."
    );
  }
  return data.secure_url;
}
