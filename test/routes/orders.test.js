const request = require('supertest');
const express = require('express');

jest.mock('../../src/db', () => ({
    all: jest.fn((sql, params, callback) => {
        // Mock product prices
        const mockProducts = [
            {id: 1, price: 1299.99},
            {id: 2, price: 39.99},
            {id: 3, price: 149.99}
        ];
        // Filter products by the provided IDs
        const productIds = params || [];
        const products = mockProducts.filter(p => productIds.includes(p.id));
        callback(null, products);
    }),
    get: jest.fn((sql, params, callback) => {
        callback(null, {id: 1, userId: 1, productIds: '[1]', total: 1299.99, status: 'pending'});
    }),
    run: jest.fn(function (sql, params, callback) {
        const context = {lastID: 1, changes: 1};
        callback.call(context, null);
    })
}));
const db = require('../../src/db');

const routes = require('../../src/routes/orders');
const app = express();
app.use(express.json());
app.use('/', routes);


describe('GET /orders/:id', () => {
    it("200 on ok", async () => {
        const response = await request(app).get('/1');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', 1);
    })

    it("400 on NaN", async () => {
        const response = await request(app).get('/abc');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: 'Order id must be a number'})
    })
    it("404 on not found", async () => {
        db.get.mockImplementationOnce((sql, params, callback) => {
            return callback(null, null);
        });
        const response = await request(app).get('/-1');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({error: 'Order not found'})
    })
    it("500 on database error", async () => {
        db.get.mockImplementationOnce((sql, params, callback) => {
            return callback(new Error('Database error'));
        });
        const response = await request(app).get('/1');
        expect(response.status).toBe(500);
        expect(response.body).toEqual({error: 'Database error'})
    })

})

describe('POST /api/orders', () => {
    it('200 on ok', async () => {
        const response = await request(app).post('/').send({userId: 1, productIds: [1]});
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('status', 'pending');
        expect(response.body).toHaveProperty('total', 1299.99);
        expect(response.body).toHaveProperty('userId', 1);
    });

    it('400 on missing body', async () => {
        const response = await request(app).post('/').send({userId: 1});
        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: 'userId and productIds[] are required'});
    });

    it('400 on missing userId', async () => {
        const response = await request(app).post('/').send({productIds: [1]});
        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: 'userId and productIds[] are required'});
    });

    it('400 on missing productIds', async () => {
        const response = await request(app).post('/').send({userId: 1});
        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: 'userId and productIds[] are required'});
    });

    it("500 on database error all()", async () => {
        db.all.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'));
        });
        const response = await request(app).post('/').send({userId: -1, productIds: [-1]});
        expect(response.status).toBe(500)
        expect(response.body).toEqual({error: 'Database error'});
    });
    it("500 on database error run()", async () => {
        db.run.mockImplementationOnce((sql, params, callback) => {
            callback(new Error('Database error'));
        });
        const response = await request(app).post('/').send({userId: -1, productIds: [-1]});
        expect(response.status).toBe(500)
        expect(response.body).toEqual({error: 'Database error'});
    });

});
