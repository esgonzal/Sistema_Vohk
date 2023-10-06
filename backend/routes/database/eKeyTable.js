const express = require('express');
const router = express.Router();
const db = require('../../db.js');

router.post('/create', async (req, res) => {
  const { accountName, lockId, isUser } = req.body;
  try {
    await db.none(
      'INSERT INTO ekey (accountName, lockId, isUser) VALUES ($1, $2, $3) ' +
      'ON CONFLICT (accountName, lockId) ' +
      'DO UPDATE SET isUser = EXCLUDED.isUser',
      [accountName, lockId, isUser]
    );
    res.status(201).json({ message: 'eKey created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating eKey' });
  }
});
router.get('/getByUserAndLockId', async (req, res) => {
  const { accountName, lockId } = req.query;
  try {
    const eKeyRecord = await db.oneOrNone(
      'SELECT * FROM ekey WHERE accountName = $1 AND lockId = $2',
      [accountName, lockId]
    );
    if (eKeyRecord !== null) {
      res.status(200).json(eKeyRecord);
    } else {
      res.status(200).json(false);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving eKey' });
  }
});
router.put('/changeIsUser', async (req, res) => {
  const { accountName, lockId, isUser } = req.body;
  try {
    await db.none(
      'UPDATE ekey SET isuser = $1 WHERE accountname = $2 AND lockid = $3',
      [isUser, accountName, lockId]
    );
    res.status(200).json({ message: 'eKey isuser updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating eKey isuser' });
  }
});
router.delete('/delete', async (req, res) => {
  const { accountName, lockId } = req.body;
  try {
    const result = await db.result('DELETE FROM ekey WHERE accountName = $1 AND lockId = $2', [
      accountName,
      lockId,
    ]);
    if (result.rowCount === 1) {
      res.status(200).json({ message: 'eKey deleted successfully' });
    } else {
      res.status(404).json({ error: 'eKey not found or not deleted' });
    }
  } catch (error) {
    console.error('Error deleting eKey:', error);
    res.status(500).json({ error: 'Error deleting eKey' });
  }

});

module.exports = router;
