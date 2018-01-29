const express = require('express');
const passport = require('passport');
const router = express.Router();
const authorizedEmails = process.env.AUTHORIZED_EMAILS;
const authorizedDomains = process.env.AUTHORIZED_DOMAINS;

router.get('/google', passport.authenticate('google', {
  scope: ['https://www.googleapis.com/auth/userinfo.email']
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect:'/' }),
  (req, res) => {
    const authorizedEmailsArray = authorizedEmails.split(',');
    if (
      req.user && req.user.profile && req.user.profile.emails &&
      req.user.profile.emails.find(o => authorizedEmailsArray.includes(o.value) || (authorizedDomains && new RegExp('@('+ authorizedDomains+')$').test(o.value)))
    ) {
      req.session.token = req.user.token;
      res.redirect('/dashboard');
    } else {
      req.session = null;
      res.redirect('/unauthorized');
    }
  }
);

router.get('/logout', (req, res) => {
  req.logout();
  req.session = null;
  res.redirect('/');
});

module.exports = router;