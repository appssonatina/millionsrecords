// Read the file contents into an array
const givenNamesArray = require('fs').readFileSync('resources/given_names.txt', 'utf8').toString().split('\n')
const surnamesArray = require('fs').readFileSync('resources/surnames.txt', 'utf8').toString().split('\n')

// Establish connection to Mysql server
const config = { schema: 'mySchema', user: 'root', password: 'root' }
const mysqlx = require('@mysql/xdevapi')

mysqlx.getSession({ user: config.user, password: config.password })
  .then(session => {
    Promise.all([
      loadNamesToDatabase(session, 'given_names', givenNamesArray),
      loadNamesToDatabase(session, 'surnames', surnamesArray)])
      .then(() => true)
      .finally(() => session.close())
  })
  .catch(e => console.log('Error occurred', e))

async function loadNamesToDatabase (session, table, namesArray) {
  const PARTITION = 1000

  // Create the tables if necessary
  console.log(`Creating table ${table}...`)
  await session.sql(`create table if not exists ${config.schema}.${table} (_id SERIAL primary key, name text)`).execute()

  // Clean the tables
  console.log('Cleaning tables...')
  await session.sql(`truncate ${config.schema}.${table}`).execute()

  // add the given names
  console.log(`Registering names into ${config.schema}.${table}...`)

  const givenNamesTable = session.getSchema(config.schema).getTable(table)

  const startDateTime = Date.now()

  const namesArrayPartition = partition(namesArray, PARTITION)
  for (let j = 0; j < namesArrayPartition.length; j++) {
    const insertStmt = givenNamesTable.insert('name')

    for (let i = 0; i < namesArrayPartition[j].length; i++) {
      const value = namesArrayPartition[j][i].trim()
      if (value) {
        insertStmt.values(value)
      }
    }

    await insertStmt.execute()

    console.log('[%s][%s] Inserted %d records', new Date().toLocaleDateString([],
      { hour: '2-digit', minute: '2-digit', second: '2-digit' }), table, j * 1000)
  }

  // Print elapsed seconds
  const endDateTime = Date.now()
  console.log('Finished loading in %d seconds.', (endDateTime - startDateTime) / 1000)
}

// [a, b, c, d, e, f, g]
// [a, b], [c, d], [e, f], [g]

function partition (arr, chunkSize) {
  arr = [].concat(...arr)

  const chunks = []
  while (arr.length > 0) {
    chunks.push(arr.splice(0, chunkSize))
  }

  return chunks
}
