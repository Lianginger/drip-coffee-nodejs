const express = require('express')
const router = express.Router()
const Projects = require('../controllers/project')

router.get('/', (req, res) => {
  res.send('hello')
})

router.get('/platform/:platformId/projects/:projectId', Projects.findOne)

module.exports = router
