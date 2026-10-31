import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import adminRoutes from './routes/admin.js';
import contractRoutes from './routes/contracts.js';
import { mailConfigurado } from './services/mail.service.js';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;

// Seguridad - Helmet + CSP
app.use(helmet({
  contentSecurityPolicy: false, // en dev false, en prod configurar CSP estricta
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended:true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limit login
const loginLimiter = rateLimit({ windowMs: 60*1000, max: 8, message: { error: 'Demasiados intentos, espera 1 min' } });
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', loginLimiter);

// Rutas
app.get('/api/health', (req,res)=> res.json({ ok:true, env: process.env.NODE_ENV, renaper: process.env.RENAPER_PROVIDER, mail: mailConfigurado() ? 'smtp' : 'mock', ts: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contracts', contractRoutes);

// 404
app.use((req,res)=> res.status(404).json({ error: 'No encontrado' }));
// Error handler (Express identifica el handler por la cantidad de argumentos: debe ser 4)
app.use((err,_req,res,_next)=>{
  console.error(err);
  res.status(500).json({ error: 'Error interno', detail: err.message });
});

app.listen(PORT, ()=> {
  console.log(`\n✅ API VVinmook escuchando en http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   RENAPER provider: ${process.env.RENAPER_PROVIDER}`);
  console.log(`   Frontend cors: ${process.env.FRONTEND_URL}\n`);
});
