import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import handler from './index.js'

describe('Vercel stateless demo authentication', () => {
  beforeAll(() => {
    delete process.env.MONGODB_URI
    delete process.env.JWT_SECRET
    process.env.ENABLE_DEMO_ACCOUNTS = 'true'
  })

  it('reports a healthy stateless demo runtime without MongoDB', async () => {
    const response = await request(handler).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.data.runtime).toBe('stateless-demo')
  })

  it('logs in the published customer demo account', async () => {
    const response = await request(handler).post('/api/auth/login').send({
      email: 'customer@bizzorix.demo',
      password: 'Demo1234!',
    })
    expect(response.status).toBe(200)
    expect(response.body.data.role).toBe('customer')
    expect(response.headers['set-cookie']?.[0]).toContain('bizzorix_session=')
  })
})
