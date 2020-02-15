const Project = require('../models/project')

exports.findOne = (req, res) => {
  Project.findById(
    {
      platformId: req.params.platformId,
      projectId: req.params.projectId
    },
    (err, data) => {
      if (err) {
        if (err.kind === 'not_found') {
          res.status(404).send({
            message: `Not found project with id ${req.params.projectId}.`
          })
        } else {
          res.status(500).send({
            message: 'Error retrieving project with id ' + req.params.projectId
          })
        }
      } else res.render('home', { data })
    }
  )
}
