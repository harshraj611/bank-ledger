require('dotenv').config();

const express = require('express');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const AppError = require('./src/utils/AppError');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set in the environment');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set in the environment');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bank Ledger API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);

app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

app.use(errorHandler);

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  console.error('Make sure MongoDB is running and MONGO_URI in .env is correct.');
  process.exit(1);
});
