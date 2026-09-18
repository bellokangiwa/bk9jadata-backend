const axios = require("axios");

// ================= ENV VARIABLES =================
const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;

const AIRTIME_URL = process.env.CLUBKONNECT_AIRTIME_URL;
const DATA_URL = process.env.CLUBKONNECT_DATA_URL;
const DISCOUNT_URL = process.env.CLUBKONNECT_DISCOUNT_URL;

// ================= HELPER =================
function generateRequestID() {
  return (
    "BK9JA_" +
    Date.now() +
    "_" +
    Math.floor(Math.random() * 10000)
  );
}

// ================= CLUBKONNECT SERVICE =================
const clubKonnectService = {

  // ============================================================
  // GET AIRTIME SERVICES
  // ============================================================
  getAirtimeServices: async () => {
    try {
      const response = await axios.get(DISCOUNT_URL, {
        params: {
          UserID: USER_ID,
        },
      });

      return response.data;
    } catch (err) {
      return {
        error: err.response?.data || err.message,
      };
    }
  },

  // ============================================================
  // BUY AIRTIME
  // ============================================================
  buyAirtime: async ({
    network,
    amount,
    phone,
    request_id,
  }) => {
    const requestId = request_id || generateRequestID();

    try {
      const response = await axios.get(AIRTIME_URL, {
        params: {
          UserID: USER_ID,
          APIKey: API_KEY,
          MobileNetwork: network,
          Amount: amount,
          MobileNumber: phone,
          RequestID: requestId,
        },
      });

      const result = response.data;

      console.log(
        "CLUBKONNECT AIRTIME RESPONSE:",
        JSON.stringify(result)
      );

      const status = String(
        result?.status || ""
      ).toUpperCase();

      // ========================================================
      // AIRTIME SUCCESS
      // ========================================================
      if (
        status === "ORDER_COMPLETED" ||
        result?.statuscode === "100"
      ) {
        return {
          status: "success",
          requestId,
          reference:
            result?.orderid ||
            result?.reference ||
            requestId,
          message:
            result?.remark ||
            "Airtime purchase successful",
          raw: result,
        };
      }

      // ========================================================
      // AIRTIME FAILED
      // ========================================================
      return {
        status: "failed",
        requestId,
        error:
          result?.remark ||
          result?.status ||
          "Airtime purchase failed",
        raw: result,
      };
    } catch (err) {
      console.error(
        "ClubKonnect airtime error:",
        err.response?.data || err.message
      );

      return {
        status: "failed",
        requestId,
        error:
          err.response?.data ||
          err.message,
      };
    }
  },

  // ============================================================
  // BUY DATA
  // ============================================================
  buyData: async ({
    network,
    dataplan,
    phone,
    request_id,
  }) => {
    const requestId =
      request_id || generateRequestID();

    try {
      const response = await axios.get(DATA_URL, {
        params: {
          UserID: USER_ID,
          APIKey: API_KEY,
          MobileNetwork: network,
          DataPlan: dataplan,
          MobileNumber: phone,
          RequestID: requestId,
        },
      });

      const result = response.data;

      console.log(
        "=========================================="
      );

      console.log(
        "CLUBKONNECT DATA RESPONSE:"
      );

      console.log(
        JSON.stringify(result, null, 2)
      );

      console.log(
        "=========================================="
      );

      const status = String(
        result?.status || ""
      ).toUpperCase();

      // ========================================================
      // DATA PURCHASE COMPLETED
      // ========================================================
      if (
        status === "ORDER_COMPLETED" ||
        result?.statuscode === "100"
      ) {
        return {
          status: "success",

          // Actual provider status
          providerStatus:
            status || "ORDER_COMPLETED",

          requestId,

          reference:
            result?.orderid ||
            result?.reference ||
            requestId,

          message:
            result?.remark ||
            "Data purchase successful",

          // Keep the complete provider response
          raw: result,
        };
      }

      // ========================================================
      // DATA PURCHASE ACCEPTED BY CLUBKONNECT
      // ========================================================
      //
      // ClubKonnect can return ORDER_RECEIVED when it has
      // accepted the request for processing.
      //
      // For BK9jaDataSub customer-facing transactions,
      // we treat ORDER_RECEIVED as SUCCESS so the customer
      // does not see "Pending" after their wallet has been
      // successfully debited and ClubKonnect has accepted
      // the order.
      //
      // We still save providerStatus/raw so we know exactly
      // what ClubKonnect returned.
      // ========================================================
      if (status === "ORDER_RECEIVED") {
        return {
          status: "success",

          // Preserve the real ClubKonnect status
          providerStatus: "ORDER_RECEIVED",

          requestId,

          reference:
            result?.orderid ||
            result?.reference ||
            requestId,

          message:
            "Data purchase successful",

          // Keep original provider response
          raw: result,
        };
      }

      // ========================================================
      // DATA PURCHASE ON HOLD
      // ========================================================
      if (status === "ORDER_ONHOLD") {
        return {
          status: "pending",

          // Preserve the real ClubKonnect status
          providerStatus: "ORDER_ONHOLD",

          requestId,

          reference:
            result?.orderid ||
            result?.reference ||
            requestId,

          message:
            result?.remark ||
            "Data purchase is being processed",

          // Keep original provider response
          raw: result,
        };
      }

      // ========================================================
      // DATA PURCHASE FAILED
      // ========================================================
      return {
        status: "failed",

        providerStatus:
          status || "UNKNOWN",

        requestId,

        error:
          result?.remark ||
          result?.status ||
          "ClubKonnect data purchase failed",

        raw: result,
      };

    } catch (err) {
      console.error(
        "=========================================="
      );

      console.error(
        "CLUBKONNECT DATA ERROR:"
      );

      console.error(
        err.response?.data ||
        err.message
      );

      console.error(
        "=========================================="
      );

      return {
        status: "failed",

        requestId,

        error:
          err.response?.data ||
          err.message,
      };
    }
  },

  // ============================================================
  // VERIFY TRANSACTION
  // ============================================================
  verifyTransaction: async (
    requestId
  ) => {
    try {
      const response = await axios.get(
        "https://www.nellobytesystems.com/APIQuery.asp",
        {
          params: {
            UserID: USER_ID,
            APIKey: API_KEY,
            RequestID: requestId,
          },
        }
      );

      return response.data;
    } catch (err) {
      return {
        error:
          err.response?.data ||
          err.message,
      };
    }
  },
};

// ============================================================
// EXPORT
// ============================================================
module.exports = clubKonnectService;