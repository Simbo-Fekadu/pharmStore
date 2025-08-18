import Inventory from "../models/inventory.model.js";
import Medicine from "../models/medicine.model.js";
import Request from "../models/request.model.js";

// Create or update inventory for a location
export const upsertInventory = async (req, res, next) => {
  try {
    const {
      medicineId,
      locationType,
      locationId,
      quantity,
      batchNumber,
      expiryDate,
    } = req.body;
    // For initial stock entry enforce Store location type
    if (locationType !== "Store") {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Direct stock entry allowed only at Store. Branches must request.",
        });
    }
    let inventory = await Inventory.findOne({
      medicine: medicineId,
      locationType: "Store",
      locationId,
      batchNumber,
    });
    if (inventory) {
      inventory.quantity += quantity;
      if (expiryDate) inventory.expiryDate = expiryDate;
      await inventory.save();
      return res.status(200).json({
        success: true,
        message: "Inventory updated successfully",
        inventory,
      });
    } else {
      inventory = new Inventory({
        medicine: medicineId,
        locationType: "Store",
        locationId,
        quantity,
        batchNumber,
        expiryDate,
      });
      await inventory.save();
      return res.status(201).json({
        success: true,
        message: "Inventory created successfully",
        inventory,
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get inventory for a location
export const getInventory = async (req, res, next) => {
  try {
    const { locationType, locationId } = req.query;
    const inventory = await Inventory.find({
      locationType,
      locationId,
    }).populate("medicine");
    res.status(200).json({ success: true, inventory });
  } catch (error) {
    next(error);
  }
};

// Transfer medicine from store to branch
export const transferMedicine = async (req, res, next) => {
  try {
    const { medicineId, fromLocationId, toLocationId, quantity, batchNumber } =
      req.body;
    // Decrement from store
    const storeInventory = await Inventory.findOne({
      medicine: medicineId,
      locationType: "Store",
      locationId: fromLocationId,
      batchNumber,
    });
    if (!storeInventory || storeInventory.quantity < quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient stock in store" });
    }
    storeInventory.quantity -= quantity;
    await storeInventory.save();
    // Increment in branch
    let branchInventory = await Inventory.findOne({
      medicine: medicineId,
      locationType: "Branch",
      locationId: toLocationId,
      batchNumber,
    });
    if (branchInventory) {
      branchInventory.quantity += quantity;
      await branchInventory.save();
    } else {
      branchInventory = new Inventory({
        medicine: medicineId,
        locationType: "Branch",
        locationId: toLocationId,
        quantity,
        batchNumber,
      });
      await branchInventory.save();
    }
    res.status(200).json({
      success: true,
      message: "Transfer successful",
      storeInventory,
      branchInventory,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Branch requests medicine from central store
export const createRequest = async (req, res) => {
  try {
    const { medicineId, branchId, quantity, batchNumber, reason } = req.body;
    if (!medicineId || !branchId || !quantity)
      return res.status(400).json({
        success: false,
        message: "medicineId, branchId, quantity required",
      });
    const request = await Request.create({
      medicine: medicineId,
      branch: branchId,
      quantity,
      batchNumber,
      reason,
    });
    res
      .status(201)
      .json({ success: true, message: "Request created", request });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listRequests = async (_req, res) => {
  try {
    const requests = await Request.find()
      .populate("medicine")
      .populate("branch")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (request.status !== "Pending")
      return res
        .status(400)
        .json({ success: false, message: "Request already processed" });

    // Attempt transfer from Store (requires storeId in body)
    const { storeId } = req.body;
    if (!storeId)
      return res
        .status(400)
        .json({ success: false, message: "storeId required to fulfill" });

    const storeInventory = await Inventory.findOne({
      medicine: request.medicine,
      locationType: "Store",
      locationId: storeId,
      batchNumber: request.batchNumber,
    });
    if (!storeInventory || storeInventory.quantity < request.quantity)
      return res.status(400).json({
        success: false,
        message: "Insufficient stock in store for this batch",
      });

    storeInventory.quantity -= request.quantity;
    await storeInventory.save();

    let branchInventory = await Inventory.findOne({
      medicine: request.medicine,
      locationType: "Branch",
      locationId: request.branch,
      batchNumber: request.batchNumber,
    });
    if (branchInventory) {
      branchInventory.quantity += request.quantity;
      await branchInventory.save();
    } else {
      branchInventory = await Inventory.create({
        medicine: request.medicine,
        locationType: "Branch",
        locationId: request.branch,
        quantity: request.quantity,
        batchNumber: request.batchNumber,
      });
    }

    request.status = "Fulfilled";
    request.fulfilledAt = new Date();
    await request.save();

    res.status(200).json({
      success: true,
      message: "Request fulfilled",
      request,
      storeInventory,
      branchInventory,
    });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const request = await Request.findById(id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (request.status !== "Pending")
      return res
        .status(400)
        .json({ success: false, message: "Request already processed" });
    request.status = "Rejected";
    request.rejectionNote = note;
    await request.save();
    res
      .status(200)
      .json({ success: true, message: "Request rejected", request });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
