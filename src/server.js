const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

require('./db/seed-once');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  secret: 'seroja-decor-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

app.use('/login', require('./routes/auth'));
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.use(requireAuth);

app.use('/', require('./routes/dashboard'));
app.use('/pos', require('./routes/pos'));
app.use('/inventory', require('./routes/inventory'));
app.use('/customers', require('./routes/customers'));
app.use('/suppliers', require('./routes/suppliers'));
app.use('/debts', require('./routes/debts'));
app.use('/sales-book', require('./routes/salesBook'));
app.use('/purchases-book', require('./routes/purchasesBook'));
app.use('/purchases', require('./routes/purchases'));
app.use('/receipt', require('./routes/receipt'));

app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log(`POS Seroja Decor running at http://localhost:${PORT}`);
});
