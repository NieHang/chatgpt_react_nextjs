import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB

const g = global as unknown as {
  _mongoClientPromise?: Promise<MongoClient>
}

function createMongoClientPromise() {
  return MongoClient.connect(uri!, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  }).catch((error) => {
    g._mongoClientPromise = undefined
    throw error
  })
}

export async function getDb() {
  if (!uri) {
    console.warn('[db] MONGODB_URI not set. Running without persistence.')
    return null
  }
  if (!g._mongoClientPromise) {
    g._mongoClientPromise = createMongoClientPromise()
  }

  try {
    const c = await g._mongoClientPromise
    return c.db(dbName)
  } catch (error) {
    g._mongoClientPromise = undefined
    throw error
  }
}

