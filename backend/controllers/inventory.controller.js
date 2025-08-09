import Inventory from "../models/inventory.model.js";
import Medicine from "../models/medicine.model.js";

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
    let inventory = await Inventory.findOne({
      medicine: medicineId,
      locationType,
      locationId,
      batchNumber,
    });
    if (inventory) {
      inventory.quantity += quantity;
      if (expiryDate) inventory.expiryDate = expiryDate;
      await inventory.save();
      return res
        .status(200)
        .json({
          success: true,
          message: "Inventory updated successfully",
          inventory,
        });
    } else {
      inventory = new Inventory({
        medicine: medicineId,
        locationType,
        locationId,
        quantity,
        batchNumber,
        expiryDate,
      });
      await inventory.save();
      return res
        .status(201)
        .json({
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
    res
      .status(200)
      .json({
        success: true,
        message: "Transfer successful",
        storeInventory,
        branchInventory,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
