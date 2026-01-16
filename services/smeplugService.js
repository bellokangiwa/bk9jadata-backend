const axios = require("axios");

const SMEPLUG_BASE_URL = process.env.SMEPLUG_BASE_URL;
const SMEPLUG_SECRET_KEY = process.env.SMEPLUG_SECRET_KEY;

const smeplugService = {

  buyData: async ({ network_id, plan_id, phone }) => {
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
        }
      );

      if (response.data.status !== true) {
        return { status: "failed", raw: response.data };
      }

      return {
        status: "success",
        reference: response.data.data.reference,
        message: response.data.data.msg,
        raw: response.data,
      };

    } catch (err) {
      return {
        status: "failed",
        error: err.response?.data || err.message,
      };
    }
  },

};

module.exports = smeplugService;