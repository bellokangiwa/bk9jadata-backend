const axios = require("axios");

const RUFISDATA_DATA_URL = "https://rufisdata.com/api/data/";

// Check whether RufisData returned an empty response body.
function isEmptyBody(payload) {
  if (payload === null || payload === undefined) {
    return true;
  }

  if (typeof payload === "string") {
    return payload.trim().length === 0;
  }

  if (typeof payload === "object") {
    return Object.keys(payload).length === 0;
  }

  return false;
}

// Normalize provider responses.
function normalizeRufisDataResponse(payload, httpStatus = null) {
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

  const providerError =
    nested?.error ??
    payload?.error ??
    null;

  const errorMessage = Array.isArray(providerError)
    ? providerError.join("; ")
    : providerError
      ? String(providerError)
      : null;

  const message =
    nested?.message ??
    nested?.api_response ??
    payload?.message ??
    payload?.api_response ??
    errorMessage ??
    "RufisData response received";

  // 1. Explicit success from RufisData.
  if (
    ["success", "successful", "completed", "complete", "delivered"].includes(
      rawStatus
    )
  ) {
    return {
      status: "success",
      message,
      reference,
      raw: payload,
    };
  }

  // 2. Explicit provider failure.
  if (
    ["failed", "failure", "fail", "rejected", "error", "cancelled", "canceled"].includes(
      rawStatus
    )
  ) {
    return {
      status: "failed",
      error: message,
      reference,
      raw: payload,
    };
  }

  // 3. Explicit pending response.
  if (
    ["pending", "processing", "queued", "in progress", "in_progress"].includes(
      rawStatus
    )
  ) {
    return {
      status: "pending",
      message,
      reference,
      raw: payload,
    };
  }

  // 4. An explicit error object or error array is a failure.
  if (errorMessage) {
    return {
      status: "failed",
      error: errorMessage,
      reference,
      raw: payload,
    };
  }

  // 5. Handle an empty response body.
  if (isEmptyBody(payload)) {
    const code = Number(httpStatus);

    // HTTP 202 means accepted but not necessarily completed.
    if (code === 202) {
      return {
        status: "pending",
        message: "RufisData accepted the request; completion is not yet confirmed.",
        reference: null,
        raw: {
          httpStatus: code,
          responseBody: null,
        },
      };
    }

    // A documented empty-body 2xx response is treated as success.
    // This includes HTTP 200, 201 and 204.
    if (code >= 200 && code < 300) {
      return {
        status: "success",
        message: "RufisData accepted the purchase successfully.",
        reference: null,
        raw: {
          httpStatus: code,
          responseBody: null,
        },
      };
    }

    // Client-side HTTP errors.
    if (code >= 400 && code < 500) {
      return {
        status: "failed",
        error: `RufisData rejected the request. HTTP ${code}`,
        reference: null,
        raw: {
          httpStatus: code,
          responseBody: null,
        },
      };
    }
  }

  // 6. Never guess when the response is unfamiliar.
  return {
    status: "pending",
    message: "RufisData response needs further verification.",
    reference,
    raw: {
      httpStatus,
      responseBody: payload,
    },
  };
}

async function buyData({
  network,
  planId,
  phone,
  portedNumber = true,
}) {
  const token = process.env.RUFISDATA_API_TOKEN;

  if (!token) {
    throw new Error(
      "RUFISDATA_API_TOKEN is missing from backend environment variables"
    );
  }

  const requestBody = {
    network: Number(network),
    mobile_number: phone,
    plan: Number(planId),
    Ported_number:
      portedNumber === true ||
      String(portedNumber).toLowerCase() === "true",
  };

  console.log("RUFISDATA PURCHASE REQUEST:", {
    network: requestBody.network,
    plan: requestBody.plan,
    mobile_number: requestBody.mobile_number,
    Ported_number: requestBody.Ported_number,
  });

  try {
    const response = await axios.post(
      RUFISDATA_DATA_URL,
      requestBody,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 45000,
      }
    );

    // Log response metadata without exposing API credentials.
    console.log("RUFISDATA HTTP RESPONSE:", {
      status: response.status,
      statusText: response.statusText,
      hasResponseBody: !isEmptyBody(response.data),
    });

    return normalizeRufisDataResponse(
      response.data,
      response.status
    );

  } catch (error) {
    // RufisData returned an HTTP error response.
    if (error.response) {
      console.error("RUFISDATA HTTP ERROR:", {
        status: error.response.status,
        statusText: error.response.statusText,
        responseBody: error.response.data,
      });

      return normalizeRufisDataResponse(
        error.response.data,
        error.response.status
      );
    }

    // Network timeout or connection failure:
    // the provider might already have received the purchase.
    console.error("RUFISDATA CONNECTION ERROR:", error.message);

    return {
      status: "pending",
      message: "RufisData response could not be confirmed. Check the provider before retrying.",
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
