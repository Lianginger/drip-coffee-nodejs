const db = require("../models");
const AdAccountInfo = db.AdAccountInfo;

exports.insert = async (req, res) => {
  const { adAccountId, platformId, projectId } = req.body;
  const [adAccountInfoInstance, created] = await AdAccountInfo.findOrCreate({
    where: {
      adAccountId,
    },
  });
  adAccountInfoInstance.platformId = platformId;
  adAccountInfoInstance.projectId = projectId;
  await adAccountInfoInstance.save();

  res.json({
    status: "ok",
  });
};

exports.find = async (req, res) => {
  const adAccountId = req.params.adAccountId;
  const adAccountInfoData = await AdAccountInfo.findOne({
    where: {
      adAccountId,
    },
  });
  res.json(adAccountInfoData);
};
