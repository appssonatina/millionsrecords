// Establish connection to Mysql server
const config = { schema: 'mySchema', user: 'root', password: 'root' }
const mysqlx = require('@mysql/xdevapi')

const NUM_PERSONS = 20000000
const BLOCK = 5000

let givenNamesArray = []
let surnamesArray = []
mysqlx.getSession({ user: config.user, password: config.password })
  .then(session => {
    loadNamesFromDatabase(session)
      .then(() => createPersons(session, NUM_PERSONS))
      .then(() => true)
      .catch(e => console.log('Error occurred', e))
      .finally(() => session.close())
  })
  .catch(e => console.log('Error occurred', e))

async function loadNamesFromDatabase (session) {
  const givenNamesTable = session.getSchema(config.schema).getTable('given_names')
  const surnamesTable = session.getSchema(config.schema).getTable('surnames')

  surnamesArray = (await surnamesTable.select('name').execute()).fetchAll()
  givenNamesArray = (await givenNamesTable.select('name').execute()).fetchAll()
}

async function createPersons (session, numberOfPersonsToCreate) {
  const personTable = session.getSchema(config.schema).getTable('person')

  // Create person table if necessary
  console.log("Creating 'person' table ...")
  await session.sql(`create table if not exists ${config.schema}.person (_id SERIAL primary key, givenName text, middleNames text, surname text, docIdType text, docIdNumber text, searchFullName text, searchFullNameBackwards text)`).execute() // UNIQUE (docIdType(20), docIdNumber(40)

  // Clean person table
  console.log('Cleaning person table...')
  await session.sql(`truncate ${config.schema}.person`).execute()

  const startDateTime = Date.now()
  const docIdGen = buildDocIdTypeAndNumber()

  console.log('Inserting persons...')

  let insertStmt = createPersonTableInsertStmt(personTable)

  let waitingForInsertion = 0
  for (let i = 0; i < numberOfPersonsToCreate; i++) {
    const { givenName, middleNames, surname } = buildFullName(givenNamesArray, surnamesArray)
    const { docIdType, docIdNumber } = docIdGen.next().value
    const fullName = `${givenName} ${middleNames} ${surname}`.toLowerCase().normalize()
    const fullNameReversed = fullName.split('').reverse().join('')

    if (!givenName || !middleNames || !surname || !docIdType || !docIdNumber) {
      console.log(`${givenName} - ${middleNames} - ${surname} - ${docIdType} - ${docIdNumber}`)
    }

    insertStmt.values(givenName, middleNames, surname, docIdType, docIdNumber, fullName, fullNameReversed)
    waitingForInsertion++

    if (waitingForInsertion >= BLOCK) {
    // Insert the name in the database
      await insertStmt.execute()
      insertStmt = createPersonTableInsertStmt(personTable)
      log(i + 1)

      waitingForInsertion = 0
    }
  }

  if (waitingForInsertion > 0) {
    await insertStmt.execute()
    log(numberOfPersonsToCreate)
  }

  // Print elapsed seconds
  const endDateTime = Date.now()
  console.log('Finished loading in %d seconds.', (endDateTime - startDateTime) / 1000)
}

function createPersonTableInsertStmt (personTable) {
  return personTable.insert('givenName', 'middleNames', 'surname',
    'docIdType', 'docIdNumber', 'searchFullName', 'searchFullNameBackwards')
}

function log (numInsertedPersons) {
  console.log('[%s] Inserted %d records', new Date().toLocaleDateString([],
    { hour: '2-digit', minute: '2-digit', second: '2-digit' }), numInsertedPersons)
}

function randomInt (min, max) {
  return Math.trunc(Math.random() * (max - min) + min)
}

function * buildDocIdTypeAndNumber () {
  const docIdTypesArray = ['CITIZEN_CARD', 'PASSPORT', 'FOREIGN_ID_CARD']
  const aCharCode = 'a'.charCodeAt(0)
  const zCharCode = 'z'.charCodeAt(0)
  const randomCode = (length) => new Array(length).fill(undefined).map(i => String.fromCharCode(randomInt(aCharCode, zCharCode + 1))).join('')

  const cStart = 100000
  const cLimit = 999999
  let start = cStart

  while (1) {
    const docIdType = docIdTypesArray[randomInt(0, docIdTypesArray.length)]
    const docIdNumber = `${randomCode(4)}-${start}-${randomCode(2)}`
    start++

    if (start > cLimit) {
      start = cStart
    }

    yield ({ docIdType: docIdType, docIdNumber: docIdNumber })
  }
}

const G = 'G' // Given name code
const S = 'S' // Surname code

function buildFullName () {
  const numberOfPartNames = randomInt(3, 7)

  if (numberOfPartNames === 3) {
    const parts = buildNameParts([G, S, S])
    return { givenName: parts[0], middleNames: parts[1], surname: parts[2] }
  } else if (numberOfPartNames === 4) {
    const parts = buildNameParts([G, S, S, S])
    return { givenName: parts[0], middleNames: parts[1] + ' ' + parts[2], surname: parts[3] }
  } else if (numberOfPartNames === 5) {
    const parts = buildNameParts([G, G, S, S, S])
    return { givenName: parts[0], middleNames: parts[1] + ' ' + parts[2] + ' ' + parts[3], surname: parts[4] }
  } else if (numberOfPartNames === 6) {
    const parts = buildNameParts([G, G, S, S, S, S])
    return {
      givenName: parts[0],
      middleNames: parts[1] + ' ' + parts[2] + ' ' + parts[3] + ' ' + parts[4],
      surname: parts[5]
    }
  }
}

function buildNameParts (namesDefArray) {
  const result = []

  const namePart = (namesArrayToUse) => {
    while (true) {
      const s = namesArrayToUse[randomInt(0, namesArrayToUse.length)][0]
      if (result.every(i => i !== s)) {
        return s
      }
    }
  }

  namesDefArray.forEach(nameDef =>
    result.push(namePart(nameDef === G ? givenNamesArray : surnamesArray))
  )

  return result
}
