const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fetch = require('isomorphic-fetch');
const authenticate = require('../helpers/middleware').authenticate;

const elements = 25;

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Log in to continue' });
});

router.get('/dashboard', async(req, res, next) => {
  const created = await req.db.users
    .count({ where: { status: null } });
  const rejected = await req.db.users
    .count({ where: { status: 'rejected' } });
  const approved = await req.db.users
    .count({ where: { status: 'approved' } });
  const pending = await req.db.users
    .count({ where: { status: 'manual_review' } });
  const all = await req.db.users
    .count();

  res.render('dashboard', {
    title: 'Dashboard',
    approved,
    rejected,
    pending,
    created,
    all
  });
});

router.get('/user/:id', (req, res, next) => {
  req.db.users.findOne({
    where: { id: req.params.id }
  }).then(
    function(user) {
      res.render('user', {
        title: 'User details',
        user
      });
    }
  );
});

router.get('/users/created', authenticate(), (req, res, next) => {
  listUser(req, res, next, {
    location: 'users/created',
    showActions: false,
    title: 'Created users',
    where: { status: null }
  });
});

router.get('/users/pending', authenticate(), (req, res, next) => {
  listUser(req, res, next, {
    location: 'users/pending',
    showActions: true,
    title: 'Pending approval users',
    where: { status: 'manual_review' }
  });
});

router.get('/users/approved', authenticate(), (req, res, next) => {
  listUser(req, res, next, {
    location: 'users/approved',
    showActions: false,
    title: 'Approved users',
    where: { status: 'approved' }
  });
});

router.get('/users/rejected', authenticate(), (req, res, next) => {
  listUser(req, res, next, {
    location: 'users/rejected',
    showActions: true,
    title: 'Rejected users',
    where: { status: 'rejected' }
  });
});

router.get('/users/all', authenticate(), (req, res, next) => {
  listUser(req, res, next, {
    location: 'users/all',
    showActions: false,
    title: 'All users',
    where: { }
  });
});

const listUser = async(req, res, next, options) => {
  var page = parseInt(req.query.page) || 1;
  const count = await req.db.users.count({ where: options.where });

  const users = await req.db.users.findAll(
    {
      order: [['updated_at', 'DESC']],
      offset: parseInt((page - 1) * elements),
      limit: elements,
      where: options.where
    }
  );

  res.render('users', {
    page: page,
    showLast: count > page * elements,
    location: options.location,
    showActions: options.showActions,
    title: options.title,
    users: users
  });
}

router.post('/approve', authenticate(), (req, res, next) => {
  req.db.users.update({
    status: 'approved',
  }, { where: { id: req.body['ids[]'] } });

  req.db.users.findAll({ where: { id: req.body['ids[]'] } })
    .then(
      function(users) {
        const emails = [];
        for(let i = 0; i < users.length; i += 1) {
          emails.push(users[i].email);
        }
        const token = jwt.sign({
          emails,
        }, process.env.JWT_SECRET, { expiresIn: '1d' });
        fetch(`${process.env.FAUCET_URL}/api/approve_account?token=${token}`)
          .then(function(response) {
            return response.json();
          })
          .then(function(result) {
            res.json({
              success: result.success,
              ids: req.body['ids[]'],
            });
          });
      }
    );
});

router.post('/reject', authenticate(), (req, res, next) => {
  req.db.users.update({
    status: 'rejected',
  }, { where: { id: req.body['ids[]'] } });
  res.json({
    success: true,
    ids: req.body['ids[]'],
  });
});

router.get('/authenticated', (req, res, next) => {
  res.render('authenticated', {
    title: 'Authenticated'
  });
});

router.get('/unauthorized', (req, res, next) => {
  res.render('unauthorized', {
    title: 'Authorized'
  });
});

module.exports = router;
