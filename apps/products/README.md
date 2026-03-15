# Product Catalog Microservice

Product catalog backend for the e-commerce microservices assignment. It provides CRUD for products and **integration endpoints** for other services (e.g. Orders).

## Features

- **CRUD**: Create, read, update, delete products
- **List with filters**: Pagination, category, search, sort
- **Integration**: `GET /products/bulk?ids=id1,id2` for Orders service to resolve product details
- **OpenAPI**: Swagger UI at `/api`
- **Health**: `GET /` for readiness

## Run locally

1. Copy env and set MongoDB:
   ```bash
   cp apps/products/.env.example apps/products/.env
   # Edit MONGODB_URI (e.g. mongodb://localhost:27017/products)
   ```
2. From repo root:
   ```bash
   pnpm install
   pnpm run build products
   node dist/apps/products/main
   ```
   Or with watch: `nest start products --watch`

3. Open:
   - API: http://localhost:3002
   - Swagger: http://localhost:3002/api

## Run with Docker

From repo root:

```bash
docker-compose up products
```

Ensure `apps/products/.env` exists or set `MONGODB_URI=mongodb://mongo:27017/products` in docker-compose.

## Integration (for assignment demo)

**With Orders service:** Orders can call this service to get product details when creating an order:

- `GET /products/:id` – single product
- `GET /products/bulk?ids=id1,id2,id3` – multiple products by ID

Example (from Orders service or any client):

```bash
curl "http://localhost:3002/products/bulk?ids=507f1f77bcf86cd799439011,507f191e810c19729de860ea"
```

## API contract

See **Swagger** at `http://localhost:3002/api` or the OpenAPI JSON at `http://localhost:3002/api-json`.

## Environment

| Variable     | Description                    | Default |
|-------------|--------------------------------|---------|
| PORT        | HTTP port                      | 3002    |
| MONGODB_URI | MongoDB connection string      | required |
