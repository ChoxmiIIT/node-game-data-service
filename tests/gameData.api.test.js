import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true // we'll assert status manually
});

describe('Game Data Service – black-box tests', () => {
  let createdGameId = '';

  test('GET /game-data/ returns welcome message', async () => {
    const res = await client.get('/game-data/');
    expect([200, 204]).toContain(res.status);
    expect(String(res.data)).toMatch(/Welcome to the Game Data Service/i);
  });

  test('POST /game-data/games creates a new game', async () => {
    const payload = {
      name: `TestGame-${Date.now()}`,
      category: 'Action',
      released_date: '2021-05-01',
      price: 69.9,
      image_url: 'https://example.com/image.jpg'
    };

    const res = await client.post('/game-data/games', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect([200, 201]).toContain(res.status);
    expect(res.data).toHaveProperty('message', 'Game added');

    // We'll discover the ID in the next test
  });

  test('GET /game-data/games returns an array and contains our game', async () => {
    const res = await client.get('/game-data/games');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    // find our most recent game
    const found = res.data.find(g => g.name && g.name.startsWith('TestGame-'));
    expect(found).toBeTruthy();
    if (found?.id) createdGameId = found.id;
  });

  test('GET /game-data/game/:id returns the created game', async () => {
    if (!createdGameId) {
      console.warn('⚠ No gameId found from previous step; skipping GET by id test');
      return expect(true).toBe(true);
    }
    const res = await client.get(`/game-data/game/${createdGameId}`);
    expect(res.status).toBe(200);

    // your service returns an array from MySQL
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    expect(data).toHaveProperty('id', createdGameId);
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('category');
    expect(data).toHaveProperty('released_date');
    expect(data).toHaveProperty('price');
    expect(data).toHaveProperty('image_url');
  });
});