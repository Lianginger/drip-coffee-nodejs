const db = require('../models')
const GoogleAnalyticsViewId = db.GoogleAnalyticsViewId

exports.createOrUpdate = async (req, res) => {
  const { adAccountId, topic, viewId } = req.body
  const [viewIdInstance, created] = await GoogleAnalyticsViewId.findOrCreate({
    where: {
      adAccountId,
      topic,
    },
  })
  if (viewId === '') {
    await viewIdInstance.destroy()
  } else {
    viewIdInstance.viewId = viewId
    await viewIdInstance.save()
  }

  res.json({
    status: 'ok',
  })
}

exports.find = async (req, res) => {
  const { adAccountId } = req.params
  const viewIds = await GoogleAnalyticsViewId.findAll({
    where: {
      adAccountId,
    },
  })
  res.json(viewIds)
}
