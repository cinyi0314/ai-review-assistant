require('dotenv').config();

const express = require('express');
const cors = require('cors');

const uploadRoutes = require('./routes/upload');
const generateRoutes = require('./routes/generate');

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- middleware ---------------
app.use(cors());
app.use(express.json());

// --------------- routes ---------------
app.get('/ping', (_req, res) => {
  res.json({ message: 'pong' });
});

app.use('/api/upload', uploadRoutes);
app.use('/api/generate', generateRoutes);

// --------------- start ---------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`DeepSeek API key ${process.env.DEEPSEEK_API_KEY ? 'loaded' : 'NOT SET'}`);
});
