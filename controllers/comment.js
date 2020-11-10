const db = require('../models')
const Comment = db.Comment

exports.insert = async (req, res) => {
  const { adAccountId, date, comment } = req.body
  const [ commentInstance, created] = await Comment.findOrCreate({
    where: {
      adAccountId, date
    }
  })
  if (comment === '') {
    await commentInstance.destroy()
  } else {
    commentInstance.comment = comment
    await commentInstance.save()
  }
  
  res.json({
    status: 'ok',
  })
}

exports.find = async (req, res) => {
  const adAccountId = req.params.adAccountId
  const comments = await Comment.findAll({
    where: {
      adAccountId,
    },
  })
  res.json(comments)
}
