const axios = require("axios");

const RUFISDATA_DATA_URL = "https://rufisdata.com/api/data/";

// RufisData may return status fields with different capitalization.
// Only explicitly recognized statuses are treated as success/failure.
// Unknown response formats are kept as pending to avoid an unsafe refund.
function normalizeRufisDataResponse(payload) {
  const nested =
    payload?.data && typeof payload.data === "object"
      ? payload.data
      : payload;

  const statusValue =
    nested?.Status ??
    nested?.status ??
    payload?.Status ??
    payload?.status ??
    "";

  const rawStatus = String(statusValue).trim().toLowerCase();

  const reference =
    nested?.ident ??
    nested?.transaction_id ??
    nested?.reference ??
    nested?.transaction_reference ??
    nested?.id ??
    payload?.ident ??
    payload?.transaction_id ??
    payload?.reference ??
    payload?.id ??
    null;

  const message =
    nested?.message ??
    nested?.api_response ??
    payload?.message ??
    payload?.api_response ??
    "RufisData response received";

  if (["success", "successful", "completed", "complete", "delivered"].includes(rawStatus)) {
    return {
      status: "success",
      message,
      reference,
      raw: payload,
    };
  }

  if (["pending", "processing", "queued", "in progress", "in_progress"].includes(rawStatus)) {
    return {
      status: "pending",
      message,
      reference,
      raw: payload,
    };
  }

  if (["failed", "failure", "fail", "rejected", "error", "cancelled", "canceled"].includes(rawStatus)) {
    return {
      status: "failed",
      error: message,
      reference,
      raw: payload,
    };
  }

  // Do not refund or report success when RufisData's status is unfamiliar.
  return {
    status: "pending",
    message: "RufisData response received; transaction status needs confirmation.",
    reference,
    raw: payload,
  };
}

async function buyData({ network, planId, phone, portedNumber = true }) {
  const token = process.env.RUFISDATA_API_TOKEN;

  if (!token) {
    throw new Error("RUFISDATA_API_TOKEN is missing from backend environment variables");
  }

  try {
    const response = await axios.post(
      RUFISDATA_DATA_URL,
      {
        network: Number(network),
        mobile_number: phone,
        plan: Number(planId),
        Ported_number:
          portedNumber === true || String(portedNumber).toLowerCase() === "true",
      },
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 45000,
      }
    );

    return normalizeRufisDataResponse(response.data);
  } catch (error) {
    // An HTTP response can contain a provider-declared failure or pending status.
    if (error.response) {
      return normalizeRufisDataResponse(error.response.data);
    }

    // Timeout/network failure is ambiguous: RufisData may already have accepted it.
    // Return pending so the controller records it without automatically refunding.
    return {
      status: "pending",
      message: "RufisData could not confirm the request response. Check the provider before retrying.",
      reference: null,
      raw: {
        message: error.message,
        code: error.code || null,
        outcome: "unconfirmed",
      },
    };
  }
}

module.exports = {
  buyData,
  normalizeRufisDataResponse,
};
