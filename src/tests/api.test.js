import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import pool from '../database/connection.js';

describe('API Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Очищаем тестовую БД
    await pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('testuser');
      authToken = res.body.token;
      userId = res.body.user.id;
    });

    it('should login existing user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should get current user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.username).toBe('testuser');
    });
  });

  describe('Challenges', () => {
    it('should get challenges list', async () => {
      const res = await request(app)
        .get('/api/challenges/swipe?limit=10');

      expect(res.statusCode).toBe(200);
      expect(res.body.challenges).toBeDefined();
      expect(Array.isArray(res.body.challenges)).toBe(true);
    });
  });

  describe('Projects', () => {
    let projectId;

    it('should create a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Project',
          description: 'Test Description',
          type: 'video',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Test Project');
      projectId = res.body.id;
    });

    it('should get projects list', async () => {
      const res = await request(app)
        .get('/api/projects?limit=10');

      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toBeDefined();
      expect(Array.isArray(res.body.projects)).toBe(true);
    });

    it('should get project by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(projectId);
    });
  });
});
