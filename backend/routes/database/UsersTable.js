const express = require('express');
const router = express.Router();

const db = require('../../db.js');

// Create a new user
router.post('/create', async (req, res) => {
  const { accountName, originalUsername, nickname, email, phone, password } = req.body;
  try {
    // Insert a new user record into the database
    await db.none(
      'INSERT INTO Usuario (accountName, originalUsername, nickname, email, phone, password) VALUES ($1, $2, $3, $4, $5, $6)',
      [accountName, originalUsername, nickname, email, phone, password]
    );
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating user' });
  }
});
router.get('/exists/:accountName', async (req, res) => {
  const { accountName } = req.params;
  try {
    const user = await db.query('SELECT COUNT(*) FROM Usuario WHERE accountName = $1', [accountName]);
    const userExists = parseInt(user[0].count) > 0;
    res.json({ exists: userExists });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error checking user existence' });
  }
});
router.get('/:accountName', async (req, res) => {
  const { accountName } = req.params;
  try {
    const user = await db.query('SELECT * FROM Usuario WHERE accountName = $1', [accountName]);
    if(user !== null && user.length > 0){
      res.status(200).json(user[0])
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error checking user existence' });
  }
});
router.get('/originalusername/:accountName', async (req, res) => {
  const { accountName } = req.params;
  try {
    const originalusername = await db.query('SELECT originalusername FROM Usuario WHERE accountName = $1', [accountName]);
    if(originalusername !== null){
      res.status(200).json(originalusername)
    } else {
      res.status(404).json({ error: 'originalusername not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error checking user existence' });
  }
});
router.get('/nickname/:accountName', async (req, res) => {
  const { accountName } = req.params;
  try {
    const nickname = await db.query('SELECT nickname FROM Usuario WHERE accountName = $1', [accountName]);
    if(nickname !== null){
      res.status(200).json(nickname)
    } else {
      res.status(404).json({ error: 'nickname not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error checking user existence' });
  }
});
router.put('/nickname', async (req, res) => {
  const { accountName, nickname } = req.body;
  try {
    await db.none('UPDATE Usuario SET nickname = $1 WHERE accountName = $2', [nickname, accountName]);
    res.status(200).json({ message: 'Nickname updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating nickname' });
  }
});
router.get('/email/:accountName', async (req, res) => {
  const { accountName } = req.params;
  try {
    const email = await db.query('SELECT email FROM Usuario WHERE accountName = $1', [accountName]);
    if(email !== null){
      res.status(200).json(email)
    } else {
      res.status(404).json({ error: 'email not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error checking user existence' });
  }
});
router.put('/email', async (req, res) => {
  const { accountName, email } = req.body;
  try {
    await db.none('UPDATE Usuario SET email = $1 WHERE accountName = $2', [email, accountName]);
    res.status(200).json({ message: 'email updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating email' });
  }
});
router.get('/phone/:accountName', async (req, res) => {
  const { accountName } = req.params;
  try {
    const phone = await db.query('SELECT phone FROM Usuario WHERE accountName = $1', [accountName]);
    if(phone !== null){
      res.status(200).json(phone)
    } else {
      res.status(404).json({ error: 'phone not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error checking user existence' });
  }
});
router.put('/phone', async (req, res) => {
  const { accountName, phone } = req.body;
  try {
    await db.none('UPDATE Usuario SET phone = $1 WHERE accountName = $2', [phone, accountName]);
    res.status(200).json({ message: 'phone updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating phone' });
  }
});
router.get('/password/:accountName', async (req, res) => {
  const { accountName } = req.params;
  try {
    const password = await db.query('SELECT password FROM Usuario WHERE accountName = $1', [accountName]);
    if(password !== null){
      res.status(200).json(password)
    } else {
      res.status(404).json({ error: 'password not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error checking user existence' });
  }
});
router.put('/password', async (req, res) => {
  const { accountName, password } = req.body;
  try {
    await db.none('UPDATE Usuario SET password = $1 WHERE accountName = $2', [password, accountName]);
    res.status(200).json({ message: 'password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating password' });
  }
});


module.exports = router;
