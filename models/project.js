const sql = require('./db.js')

const Project = function() {}

Project.findById = ({ platformId, projectId }, result) => {
  sql.query(
    `
    SELECT * FROM crowdfunding.funding_timeline
    JOIN crowdfunding.fundings on crowdfunding.funding_timeline.source = crowdfunding.fundings.source and crowdfunding.funding_timeline.source_id = crowdfunding.fundings.source_id
    WHERE crowdfunding.funding_timeline.source = ${platformId} && crowdfunding.funding_timeline.source_id = '${projectId}';
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
