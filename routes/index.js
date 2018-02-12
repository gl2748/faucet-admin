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

router.get('/.well-known/healthcheck.json', (req, res) => {
  res.json({ ok: true, date: new Date().toISOString() });
});

router.get('/dashboard', authenticate(), async(req, res, next) => {
  const ongoing = await req.db.users
    .count({ where: { status: null } });
  const rejected = await req.db.users
    .count({ where: { status: 'rejected' } });
  const approved = await req.db.users
    .count({ where: { status: 'approved' } });
  const pending = await req.db.users
    .count({ where: { status: 'manual_review' } });
  const created = await req.db.users
    .count({ where: { status: 'created' } });
  const all = await req.db.users
    .count();

  res.render('dashboard', {
    title: 'Dashboard',
    ongoing,
    approved,
    rejected,
    pending,
    created,
    all
  });
});

router.get('/user/:id', authenticate(), (req, res, next) => {
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

router.get('/user/edit/:id', authenticate(), (req, res, next) => {
  req.db.users.findOne({
    where: { id: req.params.id }
  }).then(
    function(user) {
      res.render('edit-user', {
        title: 'Edit user',
        user
      });
    }
  );
});

router.post('/user/edit', authenticate(), (req, res, next) => {
  console.log(req.body);

  req.db.users.update({
    status: req.body.status,
    username: req.body.username,
    email: req.body.email,
    email_is_verified: req.body.email_is_verified === 'on',
    phone_number: req.body.phone_number,
    phone_number_is_verified: req.body.phone_number_is_verified === 'on',
    phone_code: req.body.phone_code,
    ip: req.body.ip,
  }, {
    where: { id: req.body.id }
  })
    .then(function() {
      req.db.users.findOne({
        where: { id: req.body.id }
      }).then(
        function(user) {
          res.render('edit-user', {
            title: 'Edit user',
            user
          });
        }
      );
    }
  );
});

router.get('/users/ongoing', authenticate(), (req, res, next) => {
  listUser(req, res, next, {
    location: 'users/ongoing',
    showActions: false,
    title: 'Ongoing users',
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

router.get('/users/created', authenticate(), (req, res, next) => {
  listUser(req, res, next, {
    location: 'users/created',
    showActions: false,
    title: 'Created users',
    where: { status: 'created' }
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
          .then(async function(result) {
            if(result.success) {
              await req.db.users.update({
                status: 'approved',
              }, { where: { id: req.body['ids[]'] } });
            }
            res.json({
              success: result.success,
              errors: result.errors,
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

module.exports = router;
