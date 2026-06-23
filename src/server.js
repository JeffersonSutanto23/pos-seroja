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
  res.locals.hasPermission = (key) => !!(req.session.user && req.session.user.permissions.includes(key));
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requirePermission(key) {
  return (req, res, next) => {
    if (req.session.user.permissions.includes(key)) return next();
    res.status(403).render('403', { title: 'Akses Ditolak' });
  };
}

app.use('/login', require('./routes/auth'));
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.use(requireAuth);

app.use('/', require('./routes/dashboard'));
app.use('/pos', requirePermission('pos.access'), require('./routes/pos'));
app.use('/inventory', requirePermission('inventory.view'), require('./routes/inventory'));
app.use('/customers', requirePermission('customers.manage'), require('./routes/customers'));
app.use('/suppliers', requirePermission('suppliers.manage'), require('./routes/suppliers'));
app.use('/debts', requirePermission('debts.view'), require('./routes/debts'));
app.use('/sales-book', requirePermission('sales_book.view'), require('./routes/salesBook'));
app.use('/purchases-book', requirePermission('purchases_book.view'), require('./routes/purchasesBook'));
app.use('/purchases', requirePermission('purchases.view'), require('./routes/purchases'));
app.use('/receipt', require('./routes/receipt'));
app.use('/users', requirePermission('users.manage'), require('./routes/users'));
app.use('/roles', requirePermission('roles.manage'), require('./routes/roles'));

app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log(`POS Seroja Decor running at http://localhost:${PORT}`);
});
