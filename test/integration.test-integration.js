jest.mock('../src/db', () => ({
    all: jest.fn((sql, params, callback) => {
        // Mock product prices for POST request
        const mockProducts = [
            { id: 1, price: 1299.99 },
            { id: 2, price: 39.99 }
        ];
        const productIds = params || [];
        const products = mockProducts.filter(p => productIds.includes(p.id));
        callback(null, products);
    }),
    get: jest.fn((sql, params, callback) => {
        callback(null, { id: 1, userId: 1, productIds: '[1,2]', total: 1339.98, status: 'cancelled' });
    }),
    run: jest.fn(function(sql, params, callback) {
        const context = { lastID: 1, changes: 1 };
        callback.call(context, null);
    })
}));

const express = require("express");
const routes = require("../src/routes/orders");
const request = require("supertest");

describe('test d\'integration', () => {

    const app = express();
    app.use(express.json());
    app.use('/', routes);

    it("ajouter + modifer une commande", async () => {
        const responseCreate = await request(app).post('/').send({userId: 1, productIds: [1, 2]});
        expect(responseCreate.status).toBe(201);
        expect(responseCreate.body).toHaveProperty('id');

        const id = responseCreate.body.id;

        const responseUpdate = await request(app).patch(`/${id}/status`).send({status: "cancelled"});
        expect(responseUpdate.status).toBe(200);


    })

});