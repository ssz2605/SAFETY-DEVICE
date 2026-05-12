

/**
 * ═══════════════════════════════════════════════════
 *  CPPS BACKEND SERVER
 *  Cyber Physical Production System — Safety Device
 * ═══════════════════════════════════════════════════
 */
 
require('dotenv').config();
 
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
 
const connectDB  = require('./config/database');
const queue      = require('./services/queueService');
 
// ── Routes ────────────────────────────────────────
const alertRoutes  = require('./routes/alerts');
const deviceRoutes = require('./routes/devices');
const statsRoutes  = require('./routes/stats');
 
const app    = express();
const server = http.createServer(app);
 
// ── Socket.IO setup ───────────────────────────────
const io = new Server(server, {
  cors: {
    origin:  process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});
 
// Inject Socket.IO into queue service for real-time dashboard updates
queue.setSocketIO(io);
 
// ── Middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
 
// Rate limiting — protect from sensor spam
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max:      60,           // 60 requests per minute
  message:  { success: false, error: 'Too many requests' },
});
app.use('/api/', apiLimiter);
 
// ── API Routes ─────────────────────────────────────
app.use('/api/alerts',  alertRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/stats',   statsRoutes);
 
// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', service: 'CPPS Backend', timestamp: new Date() });
});
 
// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});
 
// ── Socket.IO connection handler ──────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Dashboard connected: ${socket.id}`);
 
  // Send queue stats on connect
  queue.getQueueStats().then(stats => {
    socket.emit('queue:update', stats);
  });
 
  socket.on('disconnect', () => {
    console.log(`🔌 Dashboard disconnected: ${socket.id}`);
  });
 
  // Allow dashboard to manually trigger queue processing
  socket.on('queue:process', () => {
    queue.processNext();
  });
});
 
// ── Start Server ──────────────────────────────────
const PORT = process.env.PORT || 5000;
 
const startServer = async () => {
  await connectDB();
 
  // Start priority queue processor
  const interval = parseInt(process.env.QUEUE_PROCESS_INTERVAL_MS) || 2000;
  queue.start(interval);
 
  server.listen(PORT, () => {
    console.log('\n════════════════════════════════════════');
    console.log(`🚀 CPPS Backend running on port ${PORT}`);
    console.log(`📡 API:      http://localhost:${PORT}/api`);
    console.log(`🔌 Socket:   http://localhost:${PORT}`);
    console.log(`⚙️  Queue:    Processing every ${interval}ms`);
    console.log('════════════════════════════════════════\n');
  });
};
 
startServer().catch(err => {
  console.error('❌ Server startup failed:', err);
  process.exit(1);
});
 
module.exports = { app, server };