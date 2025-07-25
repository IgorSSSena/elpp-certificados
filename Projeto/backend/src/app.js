// src/app.js
const express = require('express');
const cors = require('cors');
const app = express();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const alunoRoutes = require('./routes/alunoRoutes');
const cursoRoutes = require('./routes/cursoRoutes');
const certificadoRoutes = require('./routes/certificadoRoutes');

app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json());

app.use(express.json());
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', alunoRoutes);
app.use('/api', cursoRoutes);
app.use('/api', certificadoRoutes);


module.exports = app;
