const { normalizePhone } = require("../utils/validation");

// BotLinkd's public Cloud API uses multipart fields, not Meta bearer tokens.
const sendCustomerImage = async ({ imageUrl, phone, customerName, resourceType = "image" }) => {
  const appkey = process.env.BOTLINKD_APP_KEY?.trim();
  const authkey = process.env.BOTLINKD_AUTH_KEY?.trim();
  const pdf = resourceType === "raw";
  const template = (pdf ? process.env.BOTLINKD_DOCUMENT_TEMPLATE : process.env.BOTLINKD_IMAGE_TEMPLATE)?.trim();
  const recipient = normalizePhone(phone);
  if (!appkey || !authkey || !template) return { status: "not_configured", error: `Set BotLinkd App Key, Auth Key and the approved ${pdf ? "DOCUMENT" : "IMAGE"} template in backend .env.` };
  if (!/^[1-9]\d{7,14}$/.test(recipient)) return { status: "failed", error: "Assigned Staff needs a valid international WhatsApp number." };
  if (!/^https:\/\//i.test(imageUrl || "")) return { status: "failed", error: "BotLinkd requires a public HTTPS document URL." };
  let params;
  try {
    params = JSON.parse(process.env.BOTLINKD_BODY_PARAMS || '["{customerName}"]');
    if (!Array.isArray(params) || params.some(value => typeof value !== "string")) throw new Error();
  } catch { return { status: "not_configured", error: "BOTLINKD_BODY_PARAMS must be a JSON array of strings matching template variables." }; }
  const form = new FormData();
  for (const [key, value] of Object.entries({ appkey, authkey, to: recipient, template,
    language: process.env.BOTLINKD_TEMPLATE_LANGUAGE || "en",
    [pdf ? "header_document_url" : "header_image_url"]: imageUrl })) form.append(key, value);
  if (pdf) form.append("header_document_filename", "customer-document.pdf");
  params.forEach((value, index) => form.append(`body_params[${index}]`, value.replaceAll("{customerName}", customerName || "Customer")));
  if (process.env.BOTLINKD_PLATFORM_ID) form.append("platform_id", process.env.BOTLINKD_PLATFORM_ID);
  if (process.env.BOTLINKD_PLATFORM_NAME) form.append("platform_name", process.env.BOTLINKD_PLATFORM_NAME);
  try {
    const response = await fetch("https://botlinkd.com/api/whatsapp/template", {
      method: "POST", body: form, signal: AbortSignal.timeout(30000), redirect: "error",
    });
    let data;
    try { data = await response.json(); } catch {
      return { status: "failed", error: "BotLinkd returned an unreadable response. Check WhatsApp before retrying to avoid a duplicate." };
    }
    const rejected = !response.ok || !data || typeof data !== "object" ||
      data.success === false || data.status === false || Boolean(data.error) ||
      ["error", "failed", "failure", "false"].includes(String(data.status).toLowerCase());
    if (rejected) {
      const detail = data?.error?.message || data?.message || (typeof data?.error === "string" ? data.error : "Check credentials, approved template, media access and plan allowance.");
      const safe = String(detail).split(appkey).join("[redacted]").split(authkey).join("[redacted]").slice(0, 350);
      return { status: "failed", error: `BotLinkd rejected the request (HTTP ${response.status || "unknown"}): ${safe}` };
    }
    // Acceptance is not a delivery/read receipt; no automatic retry after a timeout.
    const id = data.messages?.[0]?.id || data.data?.messages?.[0]?.id || data.message_id || data.data?.message_id || "";
    return { status: "sent", messageId: typeof id === "string" ? id : "" };
  } catch {
    return { status: "failed", error: "BotLinkd request could not be confirmed (connection or timeout). Document is saved. Check WhatsApp before retrying to avoid a duplicate." };
  }
};
module.exports = { sendCustomerImage };
