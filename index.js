const express = require('express');
const mysql = require('mysql2');
const app = express();
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gamedb'
});

db.connect();

app.post('/games', (req, res) => {
  const { name, category, released_date, price, image_url } = req.body;
  db.query(
    'INSERT INTO games (name, category, released_date, price, image_url) VALUES (?, ?, ?, ?, ?)',
    [name, category, released_date, price, image_url],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Game added' });
    }
  );
});

app.get('/games', (req, res) => {
  db.query('SELECT * FROM games', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.listen(5000, () => console.log('Game Data Service running on port 5000'));
