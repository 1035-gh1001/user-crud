const express = require('express');

const controller = require('./controller');

const router = express.Router();

router.get('/users', controller.getUsers);
router.post('/createuser', controller.addUser);
router.post('/updateuser', controller.updateUser);
router.post('/deleteuser', controller.deleteUser);

module.exports = router;
