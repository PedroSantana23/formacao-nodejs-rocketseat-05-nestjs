import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const schemaId = randomUUID()
const databaseName = `nest-clean-e2e-${schemaId.replace(/-/g, '')}`

function generateUniqueDatabaseUrl(databaseName: string) {
  const originalDatabaseUrl = process.env.DATABASE_URL

  if (!originalDatabaseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  const url = new URL(originalDatabaseUrl)

  url.pathname = `/${databaseName}`
  url.searchParams.delete('schema')

  return url.toString()
}

function createDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl)

  execFileSync(
    'createdb',
    [
      '-h',
      url.hostname,
      '-p',
      url.port || '5432',
      '-U',
      decodeURIComponent(url.username),
      databaseName,
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: decodeURIComponent(url.password),
      },
      stdio: 'inherit',
    },
  )
}

function dropDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl)

  execFileSync(
    'dropdb',
    [
      '--if-exists',
      '--force',
      '-h',
      url.hostname,
      '-p',
      url.port || '5432',
      '-U',
      decodeURIComponent(url.username),
      databaseName,
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: decodeURIComponent(url.password),
      },
      stdio: 'inherit',
    },
  )
}

const databaseUrl = generateUniqueDatabaseUrl(databaseName)

createDatabase(process.env.DATABASE_URL!)

process.env.E2E_DATABASE_URL = databaseUrl
process.env.DATABASE_URL = databaseUrl

const adapter = new PrismaPg({
  connectionString: databaseUrl,
})

const prisma = new PrismaClient({
  adapter,
})

beforeAll(
  () => {
    execFileSync(
      'pnpm',
      ['exec', 'prisma', 'migrate', 'deploy'],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
        stdio: 'inherit',
        shell: process.platform === 'win32',
      },
    )
  },
  30_000,
)

afterAll(
  async () => {
    await prisma.$disconnect()
    dropDatabase(databaseUrl)
  },
  30_000,
)