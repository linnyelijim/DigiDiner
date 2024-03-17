const express = require('express');
const router = express.Router();
const menuController = require('../../controllers/menuController');
var menuItemOption = require('../../models/menuItemOption');
var menuOptionData = require('../../models/menuOptionData');
var menuData = require('../../models/menuData');

// Routes for menu options
router.route('/menuOptions').get(menuController.getAllMenuOption);
router.route('/menuOptions/:id').get(menuController.getMenuOption);
router.route('/menuOptions/').post(menuController.addMenuOption);
router.route('/menuOptions/:id').put(menuController.updateMenuOption);
router.route('/menuOptions/:id').delete(menuController.removeMenuOption);

// Routes for menu items
router.route('/').get(menuController.getAllMenuItems);
router.route('/:id').get(menuController.getMenuItem);
router.route('/').post(menuController.addMenuItem);
router.route('/:id').put(menuController.updateMenuItem);
router.route('/:id').delete(menuController.removeMenuItem);

// Routes for menu item and option associations
router.route('/fullMenu/:menuItemId/options/:optionId')
    .post(menuController.addAssociation)
    .delete(menuController.removeAssociation);

module.exports = router;