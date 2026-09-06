const {
  getAllKycServices,
  getKycService,
  updateKycService,
} = require("../services/kycPricingService");

const createAdminLog = require("../utils/adminLog");

// ========================================
// GET ALL KYC PRICES
// GET /api/admin/kyc-prices
// ========================================
exports.getPrices = async (req, res) => {
  try {
    const services = await getAllKycServices();

    return res.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Get KYC prices error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to get KYC prices",
    });
  }
};

// ========================================
// GET ONE KYC PRICE
// GET /api/admin/kyc-prices/:service
// ========================================
exports.getPrice = async (req, res) => {
  try {
    const { service } = req.params;

    const data = await getKycService(service);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "KYC service not found",
      });
    }

    return res.json({
      success: true,
      service: data,
    });
  } catch (error) {
    console.error("Get KYC price error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to get KYC price",
    });
  }
};

// ========================================
// UPDATE KYC PRICE
// PATCH /api/admin/kyc-prices/:service
// ========================================
exports.updatePrice = async (req, res) => {
  try {
    const { service } = req.params;

    const { userPrice, dojahCost, isActive } = req.body;

    // Make sure at least one field was provided
    if (
      userPrice === undefined &&
      dojahCost === undefined &&
      isActive === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "Nothing to update",
      });
    }

    const updates = {};

    // Validate user price
    if (userPrice !== undefined) {
      const price = Number(userPrice);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          error: "userPrice must be a valid positive number",
        });
      }

      updates.userPrice = price;
    }

    // Validate Dojah cost
    if (dojahCost !== undefined) {
      const cost = Number(dojahCost);

      if (!Number.isFinite(cost) || cost < 0) {
        return res.status(400).json({
          success: false,
          error: "dojahCost must be a valid positive number",
        });
      }

      updates.dojahCost = cost;
    }

    // Validate active status
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "isActive must be true or false",
        });
      }

      updates.isActive = isActive;
    }

    const updated = await updateKycService(service, updates);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "KYC service not found",
      });
    }

    // Calculate current profit
    const profit = Number(updated.userPrice) - Number(updated.dojahCost);

    await createAdminLog({
      action: "UPDATE_KYC_PRICE",
      adminUid: req.admin.uid,
      adminEmail: req.admin.email,
      targetUser: null,
      details: `Updated ${updated.name}: user price ₦${updated.userPrice}, Dojah cost ₦${updated.dojahCost}, profit ₦${profit}`,
    });

    return res.json({
      success: true,
      message: "KYC service updated successfully",
      service: {
        ...updated,
        profit,
      },
    });
  } catch (error) {
    console.error("Update KYC price error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to update KYC price",
    });
  }
};

module.exports = exports;