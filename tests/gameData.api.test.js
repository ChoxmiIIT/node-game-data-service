const request = require('supertest');

// --- Mock mysql2 so we don't hit a real DB ---
const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock('mysql2', () => ({
  createConnection: jest.fn(() => ({
    connect: mockConnect,
    query: mockQuery
  }))
}));

const { app } = require('../app');

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper: set the next behavior for mockQuery
function mockQueryOnceSuccess(result) {
  mockQuery.mockImplementationOnce((sql, paramsOrCb, maybeCb) => {
    const cb = typeof paramsOrCb === 'function' ? paramsOrCb : maybeCb;
    cb(null, result);
  });
}
function mockQueryOnceError(message = 'DB error') {
  mockQuery.mockImplementationOnce((sql, paramsOrCb, maybeCb) => {
    const cb = typeof paramsOrCb === 'function' ? paramsOrCb : maybeCb;
    cb(new Error(message));
  });
}

describe('Game Data Service', () => {
  test('GET /game-data/ returns welcome text', async () => {
    const res = await request(app).get('/game-data/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Welcome to the Game Data Service/i);
    expect(mockConnect).toHaveBeenCalled(); // app attempted to connect to DB (mocked)
  });

  test('POST /game-data/games inserts and returns 201', async () => {
    // Simulate successful INSERT
    mockQueryOnceSuccess({ affectedRows: 1 });

    const payload = {
      name: 'Assassin\'s Creed',
      category: 'Action',
      released_date: '2021-05-01',
      price: 69.9,
      image_url: 'https://example.com/assassins-creed.jpg'
    };

    const res = await request(app)
      .post('/game-data/games')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Game added' });

    // Verify the SQL & parameter usage
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO games/i);
    expect(params).toEqual([
      payload.name,
      payload.category,
      payload.released_date,
      payload.price,
      payload.image_url
    ]);
  });

  test('POST /game-data/games returns 500 on DB error', async () => {
    mockQueryOnceError('insert failed');

    const res = await request(app)
      .post('/game-data/games')
      .send({
        name: 'Bad Game',
        category: 'Action',
        released_date: '2021-05-01',
        price: 10,
        image_url: 'https://x.test/img.png'
      })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'insert failed');
  });

  test('GET /game-data/games returns list', async () => {
    const rows = [
      { id: 1, name: 'A', category: 'Action', released_date: '2021-01-01', price: 10, image_url: 'x' },
      { id: 2, name: 'B', category: 'RPG', released_date: '2022-01-01', price: 20, image_url: 'y' }
    ];
    mockQueryOnceSuccess(rows);

    const res = await request(app).get('/game-data/games');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/SELECT \* FROM games/i);
  });

  test('GET /game-data/games returns 500 on DB error', async () => {
    mockQueryOnceError('select error');

    const res = await request(app).get('/game-data/games');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'select error');
  });

  test('GET /game-data/game/:id returns rows for that id', async () => {
    // NOTE: your route returns whatever MySQL returns (an array), so we assert array
    const rows = [{ id: 42, name: 'C', category: 'Strategy', released_date: '2020-01-01', price: 30, image_url: 'z' }];
    mockQueryOnceSuccess(rows);

    const res = await request(app).get('/game-data/game/42');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('id', 42);

    const [sql] = mockQuery.mock.calls[0];
    // This is an interpolation (vulnerable); test just checks the route was called
    expect(sql).toMatch(/WHERE id = 42/);
  });

  test('GET /game-data/game/:id returns 500 on DB error', async () => {
    mockQueryOnceError('by-id error');

    const res = await request(app).get('/game-data/game/1');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'by-id error');
  });
});