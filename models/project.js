const sql = require('./db.js')

const Project = function() {}

Project.findById = ({ platformId, projectId }, result) => {
  sql.query(
    `
    SELECT * FROM funding_timeline
    WHERE source = ${platformId} && source_id = '${projectId}'
    `,
    (err, res) => {
      if (err) {
        console.log('error: ', err)
        result(err, null)
        return
      }

      if (res.length) {
        // console.log('found project: ', res[0])
        result(null, res[0])
        return
      }

      // not found project with the id
      result({ kind: 'not_found' }, null)
    }
  )
}

module.exports = Project
