const axios = require("axios");

const SMEPLUG_BASE_URL = process.env.SMEPLUG_BASE_URL;
const SMEPLUG_SECRET_KEY = process.env.SMEPLUG_SECRET_KEY;

const smeplugService = {

  // ==================================================
  // BUY DATA
  // ==================================================
  buyData: async ({
    network_id,
    plan_id,
    phone,
    request_id,
  }) => {

    try {

      const response = await axios.post(
        `${SMEPLUG_BASE_URL}/data/purchase`,

        {
          network_id,
          plan_id,
          phone,
        },

        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SMEPLUG_SECRET_KEY}`,
          },

          timeout: 45000,
        }
      );

      const result = response.data;

      console.log(
        "=========================================="
      );

      console.log(
        "SMEPLUG DATA RESPONSE:"
      );

      console.log(
        JSON.stringify(result, null, 2)
      );

      console.log(
        "=========================================="
      );

      /*
       * SMEPlug normally returns status: true
       * for a successful request.
       */
      if (
        result?.status === true ||
        result?.status === "success" ||
        String(result?.status).toLowerCase() === "successful"
      ) {

        return {
          status: "success",

          requestId:
            request_id || null,

          reference:
            result?.data?.reference ||
            result?.reference ||
            request_id ||
            null,

          message:
            result?.data?.msg ||
            result?.message ||
            "Data purchase successful",

          raw: result,
        };
      }

      /*
       * Provider explicitly rejected the transaction.
       */
      return {
        status: "failed",

        requestId:
          request_id || null,

        error:
          result?.data?.msg ||
          result?.message ||
          result?.error ||
          "SMEPlug data purchase failed",

        raw: result,
      };

    } catch (err) {

      console.error(
        "=========================================="
      );

      console.error(
        "SMEPLUG DATA ERROR:"
      );

      console.error(
        err.response?.data || err.message
      );

      console.error(
        "=========================================="
      );

      return {
        status: "failed",

        requestId:
          request_id || null,

        error:
          err.response?.data ||
          err.message,
      };
    }
  },
};

module.exports = smeplugService;