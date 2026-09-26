const Customer = require("../models/Customer");
const Setting = require("../models/Setting");
const cloudinary = require("../config/cloudinary");
const { cutoffFor } = require("../utils/retention");

const getRetentionSetting = () =>
  Setting.findOneAndUpdate(
    { key: "data-retention" },
    { $setOnInsert: { retentionMonths: 2 } },
    { returnDocument: "after", upsert: true }
  );


let running = false;


const runCleanup = async () => {

  if (running) {
    return {
      deletedCount: 0,
      skipped: true
    };
  }

  running = true;

  let deletedCount = 0;
  let failedCount = 0;


  try {

    const setting = await getRetentionSetting();

    const cutoff = cutoffFor(
      new Date(),
      setting.retentionMonths
    );


    const customers = await Customer.find({
      "documents.uploadedAt": {
        $lte: cutoff
      }
    });


    for (const customer of customers) {

      const remainingDocuments = [];


      for (const doc of customer.documents || []) {


        if (
          doc.uploadedAt &&
          doc.uploadedAt <= cutoff
        ) {

          try {

            if (doc.publicId) {

              const result = await cloudinary.uploader.destroy(
                doc.publicId,
                {
                  resource_type: doc.resourceType || "image"
                }
              );


              if (
                !["ok", "not found"].includes(result.result)
              ) {
                throw new Error("Asset deletion failed");
              }

            }


            deletedCount++;


          } catch (error) {

            failedCount++;

            // agar cloudinary delete fail ho
            // to document save rahe retry ke liye
            remainingDocuments.push(doc);

          }


        } else {

          remainingDocuments.push(doc);

        }

      }


      customer.documents = remainingDocuments;

      await customer.save();

    }


    return {
      deletedCount,
      failedCount,
      cutoff
    };


  } finally {

    running = false;

  }

};


module.exports = {
  getRetentionSetting,
  runCleanup
};