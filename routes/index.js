const express = require('express')
const router = express.Router()
const Projects = require('../controllers/project')
const Project = require('../models/project')

router.get('/', (req, res) => res.render('home'))
router.get('/privacy', (req, res) => res.render('privacy'))
router.get('/crawler-status', Projects.getCrawlerStatus)

router.get('/:encryptedURL', Projects.decryptURL)
router.get('/platform/:platformId/projects/:projectId', Projects.findOne)
router.get('/api/platform/:platformId/projects/:projectId', Projects.findOneAPI)

module.exports = router
