# Bank Ledger API

A small Node.js learning project for core banking operations: user auth, account creation, deposits, transfers, balances, and transaction history.

This is a teaching backend, not production banking software. It uses a single MongoDB instance and simple sequential updates instead of replica-set transactions.

## Tech stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs

## Features

- User registration with hashed passwords
- User login that returns a JWT
- Authenticated bank account creation
- Deposit with positive-amount validation
- Transfer with ownership, balance, amount, and same-account checks
- Balance lookup
- Transaction history for an owned account
- Centralized error handling and JSON responses

## Project structure

```text
bank-ledger/
├── server.js
├── package.json
├── .env.example
└── src/
    ├── config/
    │   └── db.js
    ├── models/
    │   ├── User.js
    │   ├── Account.js
    │   └── Transaction.js
    ├── controllers/
    │   ├── authController.js
    │   └── accountController.js
    ├── routes/
    │   ├── authRoutes.js
    │   └── accountRoutes.js
    ├── middleware/
    │   ├── auth.js
    │   └── errorHandler.js
    └── utils/
        ├── AppError.js
        └── asyncHandler.js
```

## Prerequisites

- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup

```bash
npm install
```

Copy the example environment file and edit values if needed:

```bash
copy .env.example .env
```

Default local settings:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/bank-ledger
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=1d
```

## Run

```bash
npm start
```

Development with auto-restart:

```bash
npm run dev
```

Health check:

```text
GET http://localhost:3000/health
```

## API endpoints

All account routes require:

```http
Authorization: Bearer <JWT>
```

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Create a user |
| `POST` | `/api/auth/login` | No | Log in and receive a JWT |
| `POST` | `/api/accounts` | Yes | Create a bank account for the logged-in user |
| `GET` | `/api/accounts/:accountId/balance` | Yes | Get the account balance |
| `POST` | `/api/accounts/:accountId/deposit` | Yes | Deposit money |
| `POST` | `/api/accounts/:accountId/transfer` | Yes | Transfer money to another account |
| `GET` | `/api/accounts/:accountId/transactions` | Yes | List transactions for the account |

## Request and response examples

### Register

`POST /api/auth/register`

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "secret123"
}
```

`201 Created`

```json
{
  "success": true,
  "message": "User registered",
  "data": {
    "user": {
      "id": "...",
      "name": "Ada Lovelace",
      "email": "ada@example.com"
    },
    "token": "eyJhbGciOi..."
  }
}
```

### Login

`POST /api/auth/login`

```json
{
  "email": "ada@example.com",
  "password": "secret123"
}
```

### Create account

`POST /api/accounts`

Empty body. The new account belongs to the authenticated user and starts at `0`.

### Deposit

`POST /api/accounts/:accountId/deposit`

```json
{
  "amount": 100,
  "description": "Initial deposit"
}
```

### Transfer

`POST /api/accounts/:accountId/transfer`

`:accountId` is the sender account.

```json
{
  "toAccountId": "RECEIVER_ACCOUNT_OBJECT_ID",
  "amount": 25,
  "description": "Rent"
}
```

Transfers fail when:

- the amount is not a positive number
- the sender does not own the source account
- the destination account does not exist
- source and destination are the same account
- the sender balance is too low

### Balance

`GET /api/accounts/:accountId/balance`

### History

`GET /api/accounts/:accountId/transactions`

Returns deposits into the account and transfers where the account is sender or receiver.

## Test in Postman

1. Start MongoDB and the API (`npm start`).
2. Create a Postman collection named **Bank Ledger API**.
3. Add a collection variable `baseUrl` with value `http://localhost:3000`.
4. Add a collection variable `token`.

### 1. Register user A

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/register`
- Headers: `Content-Type: application/json`
- Body (raw JSON):

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

Copy `data.token` into the `token` variable. Copy `data.user.id` if you want it later.

### 2. Register user B

Repeat registration with `bob@example.com`. Keep Bob's token in a second variable, for example `bobToken`.

### 3. Log in (optional)

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/login`
- Body:

```json
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

### 4. Create Alice's account

- Method: `POST`
- URL: `{{baseUrl}}/api/accounts`
- Headers: `Authorization: Bearer {{token}}`

Save `data.account._id` as `aliceAccountId`.

### 5. Create Bob's account

Same request with Bob's token. Save `data.account._id` as `bobAccountId`.

### 6. Deposit into Alice's account

- Method: `POST`
- URL: `{{baseUrl}}/api/accounts/{{aliceAccountId}}/deposit`
- Headers: `Authorization: Bearer {{token}}`
- Body:

```json
{
  "amount": 200
}
```

Expected: `200` and an updated balance of `200`.

Try `amount: -10` or `amount: 0` and expect `400`.

### 7. Check balance

- Method: `GET`
- URL: `{{baseUrl}}/api/accounts/{{aliceAccountId}}/balance`
- Headers: `Authorization: Bearer {{token}}`

### 8. Transfer Alice to Bob

- Method: `POST`
- URL: `{{baseUrl}}/api/accounts/{{aliceAccountId}}/transfer`
- Headers: `Authorization: Bearer {{token}}`
- Body:

```json
{
  "toAccountId": "{{bobAccountId}}",
  "amount": 50
}
```

Expected: Alice `150`, Bob `50`.

Useful negative tests:

- Transfer `amount` greater than Alice's balance → `400 Insufficient balance`
- Set `toAccountId` equal to `aliceAccountId` → `400 Cannot transfer to the same account`
- Call Alice's balance route with Bob's token → `403`

### 9. Transaction history

- Method: `GET`
- URL: `{{baseUrl}}/api/accounts/{{aliceAccountId}}/transactions`
- Headers: `Authorization: Bearer {{token}}`

You should see the deposit and the outgoing transfer.

## Status codes

| Code | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Resource created |
| `400` | Validation or business-rule error |
| `401` | Missing or invalid token, or bad login |
| `403` | Authenticated, but not the account owner |
| `404` | Route or resource not found |
| `409` | Duplicate email |
| `500` | Unexpected server error |

Error body shape:

```json
{
  "success": false,
  "message": "Insufficient balance"
}
```

## How the code works

- `server.js` loads environment variables, connects to MongoDB, mounts routes, and attaches the error middleware last.
- Passwords are hashed in a Mongoose `pre('save')` hook with bcrypt.
- JWT middleware reads `Authorization: Bearer <token>`, verifies it, and attaches `req.user`.
- Account routes always check that the logged-in user owns the source account.
- Transfers update the sender first, then the receiver. If the receiver save fails, the sender amount is added back. This is a simple rollback for a learning project, not a substitute for MongoDB multi-document transactions.

## Out of scope

This version does not include email, OAuth, Redis, a frontend, payment gateways, idempotency keys, double-entry accounting, or replica-set transactions.
