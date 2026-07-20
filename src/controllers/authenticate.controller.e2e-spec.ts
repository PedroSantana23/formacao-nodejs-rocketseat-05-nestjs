import { INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { hash } from "bcryptjs"
import { AppModule } from "src/app.module"
import { PrismaService } from "src/prisma/prisma.service"
import request from "supertest"

describe('Authenticate (E2E)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    prisma = moduleRef.get(PrismaService)

    await app.init();
  });
  
  test('[POST] /sessions', async () => {
    await prisma.user.create({
      data: {
        name: 'Teste',
        email: 'teste@email.com',
        password: await hash('123456', 8),
      }
    })

    const response = await request(app.getHttpServer()).post('/sessions').send({
      email: 'teste@email.com',
      password: '123456'
    })

    expect(response.statusCode).toBe(201)
    expect(response.body).toEqual({
      access_token: expect.any(String)
    })
  })
})