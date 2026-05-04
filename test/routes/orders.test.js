const request = require('supertest');
const express = require('express');

jest.mock('../../src/db', () => ({
    all: jest.fn((sql, params, callback) => {
        // Mock product prices
        const mockProducts = [
            { id: 1, price: 1299.99 },
            { id: 2, price: 39.99 },
            { id: 3, price: 149.99 }
        ];
        // Filter products by the provided IDs
        const productIds = params || [];
        const products = mockProducts.filter(p => productIds.includes(p.id));
        callback(null, products);
    }),
    get: jest.fn((sql, params, callback) => {
        callback(null, { id: 1, userId: 1, productIds: '[1]', total: 1299.99, status: 'pending' });
    }),
    run: jest.fn(function(sql, params, callback) {
        const context = { lastID: 1, changes: 1 };
        callback.call(context, null);
    })
}));

const routes = require('../../src/routes/orders');

describe('/api/orders', () => {
    const app = express();
    app.use(express.json());
    app.use('/', routes);

    it('ok', async () => {
        const response = await request(app).post('/').send({userId: 1, productIds: [1]});
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('status', 'pending');
        expect(response.body).toHaveProperty('total', 1299.99);
        expect(response.body).toHaveProperty('userId', 1);
    });

    it('missing body', async () => {
        const response = await request(app).post('/').send({userId: 1});
        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: 'userId and productIds[] are required'});
    });

    it('missing userId', async () => {
        const response = await request(app).post('/').send({productIds: [1]});
        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: 'userId and productIds[] are required'});
    });

    it('missing productIds', async () => {
        const response = await request(app).post('/').send({userId: 1});
        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: 'userId and productIds[] are required'});
    });
});
