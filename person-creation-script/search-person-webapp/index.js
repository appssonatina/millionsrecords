const express = require('express')
const formidable = require('express-formidable')
const _ = require('lodash/string')
const fs = require('fs')

const app = express()
const port = 3000

app.use(formidable())

function renderTemplate (searchResult, queryResponseTime, mappingToObjectsTime, searchNameVal, searchGivenNameQueryTypeVal) {
  const templateHtml = fs.readFileSync('index.html', 'utf8').toString()

  const compiledTemplate = _.template(templateHtml)
  const pageData = {
    data: {
      searchResult: searchResult,
      queryResponseTime: queryResponseTime,
      mappingToObjectsTime: mappingToObjectsTime,
      searchName: searchNameVal,
      searchGivenNameQueryType: searchGivenNameQueryTypeVal
    }
  }
  const content = compiledTemplate(pageData)

  return content
}

app.get('/', (req, res) => {
  res.send(renderTemplate(null))
})

const QUERY_EXACT = 0
const QUERY_STARTS_WITH = 1
const QUERY_CONTAINS_LIKE = 2
const QUERY_CONTAINS_FULLTEXT = 3
const QUERY_MATCH_WORDS_FULLTEXT = 4

function fullTextFilter (queryArg) {
  const queryCompounds = normalize(queryArg).split(/\s+/)
  const regExpVal = new RegExp('.*' + queryCompounds.join('.*') + '.*')

  //  return s => true
  return s => regExpVal.test(normalize(s.searchFullName))
}

app.post('/search', async (req, res) => {
  let queryArg = req.fields.searchName

  if (queryArg) {
    queryArg = queryArg.trim()
  }

  const queryType = Number.parseInt(req.fields.searchGivenNameQueryType)
  const filter = fullTextFilter(queryArg)

  const queryStartTime = Date.now()
  queryPersons(queryArg, queryType).then(queryResults => {
    const queryEndTime = Date.now()

    const mappingToObjectsStartTime = Date.now()

    let searchResults = []
    if (queryResults.hasData()) {
      searchResults = queryResults.toArray()[0].map(row => {
        return {
          givenName: row[0],
          middleNames: row[1],
          surname: row[2],
          searchFullName: row[5],
          searchFullNameBackwards: row[6]
        }
      }).filter(filter)
    }

    const mappingToObjectsEndTime = Date.now()

    const renderingStartDateTime = Date.now()

    const queryTime = (queryEndTime - queryStartTime) / 1000
    const mappingToObjectsTime = (mappingToObjectsEndTime - mappingToObjectsStartTime) / 1000

    let content = renderTemplate(searchResults, queryTime, mappingToObjectsTime, queryArg, queryType)

    const renderingEndDateTime = Date.now()

    content += `<div>Rendered in ${(renderingEndDateTime - renderingStartDateTime) / 1000} seconds</div>`
    res.send(content)
  })
})

const config = { schema: 'mySchema', user: 'root', password: 'root' }
async function queryPersons (queryArg, queryType) {
  const mysqlx = require('@mysql/xdevapi')

  let stmt = `select givenName, middleNames, surname, docIdType, docIdNumber, searchFullName, searchFullNameBackwards from ${config.schema}.person `
  const bindArgs = []
  switch (queryType) {
    case QUERY_STARTS_WITH:
      stmt += ' where searchFullName like ?'
      bindArgs.push(normalize(queryArg) + '%')
      break
    case QUERY_CONTAINS_LIKE:
      stmt += ' where searchFullName like ?'
      bindArgs.push('%' + normalize(queryArg).replace(/\s+/, '%') + '%')
      break
    case QUERY_CONTAINS_FULLTEXT:
      stmt = `select givenName, middleNames, surname, docIdType, docIdNumber, searchFullName, searchFullNameBackwards from ${config.schema}.person `
      stmt += ' where (MATCH(searchFullName) AGAINST(? IN BOOLEAN MODE))'
      stmt += ' union '
      stmt += `select givenName, middleNames, surname, docIdType, docIdNumber, searchFullName, searchFullNameBackwards from ${config.schema}.person `
      stmt += ' where (MATCH(searchFullNameBackwards) AGAINST(? IN BOOLEAN MODE))'
      bindArgs.push(normalize(queryArg).split(/\s+/).map(s => `+(${s}*)`).join(' '))
      bindArgs.push(normalize(queryArg).split('').reverse().join('').split(/\s+/).map(s => `+(${s}*)`).join(' '))
      break
    case QUERY_MATCH_WORDS_FULLTEXT:
      stmt += ' where (MATCH(searchFullName) AGAINST(? IN BOOLEAN MODE))'
      bindArgs.push(normalize(queryArg).split(/\s+/).map(s => '+' + s).join(' '))
      break
    case QUERY_EXACT:
    default:
      stmt += ' where searchFullName = ?'
      bindArgs.push(queryArg)
      break
  }

  // if (queryType === QUERY_CONTAINS_FULLTEXT) {
  //   stmt += ' ORDER BY MATCH(searchFullName) AGAINST(? IN BOOLEAN MODE) + MATCH(searchFullNameBackwards) AGAINST(? IN BOOLEAN MODE) DESC'
  //   bindArgs.push(normalize(queryArg).split(/\s+/).map(s => `+(${s}*)`).join(' '))
  //   bindArgs.push(normalize(queryArg).split('').reverse().join('').split(/\s+/).map(s => `+(${s}*)`).join(' '))
  // }

  stmt += ' LIMIT 1000'

  return mysqlx.getSession({ user: config.user, password: config.password })
    .then(session => {
      let q = session.sql(stmt)

      for (const bArg of bindArgs) {
        q = q.bind(bArg)
      }

      return q.execute()
        .catch(e => { console.log('Error occurred query execution', e); throw e })
        .finally(() => session.close())
    })
    .catch(e => { console.log('Error occurred in establishing session', e); throw e })
}

function normalize (str) {
  return str.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
