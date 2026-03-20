# Order Service

Microservice for order management (SE4010 Cloud Computing Assignment). Independently deployable, integrates with the **Products** service for product validation and pricing.

## Role in the Application

- **Create orders**: Accepts line items (productId + quantity), validates products and resolves prices via the Products service, then persists the order.
- **List / get orders**: By ID or by user.
- **Update order status**: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED (or CANCELLED).

## Endpoints (API Contract)

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/orders` | Create order (body: `userId`, `items[]`, optional `shippingAddress`) |
| GET    | `/orders` | List all orders |
| GET    | `/orders/by-user/:userId` | List orders for a user |
| GET    | `/orders/:id` | Get order by ID |
| PATCH  | `/orders/:id/status` | Update status (body: `{ "status": "CONFIRMED" }`) |

**OpenAPI (Swagger)** is available at `/api` when the service is running.

## Inter-Service Communication

- **Products service**: On **create order**, the Order service calls `GET {PRODUCTS_HTTP_BASEURL}/products/:productId` for each item to validate the product and get the current price. This is the **required integration** with another group member’s service.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `HTTP_PORT` | No | Port (default: 3003) |
| `PRODUCTS_HTTP_BASEURL` | For create | Base URL of Products service (e.g. `http://products:3002`) |

## Run Locally

```bash
# From repo root
pnpm install
export MONGODB_URI=mongodb://localhost:27017/orders
export PRODUCTS_HTTP_BASEURL=http://localhost:3002
pnpm run start:dev orders
```

## Docker

```bash
# Build
docker build -f apps/orders/Dockerfile -t quickbite-orders .

# Run (ensure MongoDB and Products are reachable)
docker run -p 3003:3003 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/orders \
  -e PRODUCTS_HTTP_BASEURL=http://host.docker.internal:3002 \
  quickbite-orders
```

## DevOps & Security

- **CI/CD**: GitHub Actions build and test on push/PR; on `main`, image is built and pushed to Docker Hub and deployed to Azure Container Apps (when secrets are configured).
- **Container**: Dockerfile multi-stage build; production image runs as non-root where possible.
- **Security**: Use IAM roles and security groups for cloud deployment; avoid storing secrets in code; principle of least privilege for DB and network.
- **DevSecOps**: SonarCloud (or Snyk) integrated via repo for SAST (see root `.github/workflows/sonar.yml` and `sonar-project.properties`).
