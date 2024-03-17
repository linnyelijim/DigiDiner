const databaseController = require('./databaseController');
const MenuData = require('../models/menuData');
const MenuOptionsData = require('../models/menuOptionData');

// CRUD operations for the menu
async function getAllMenuItems(req, res) {
    const menuItems = await MenuData.getAllMenuItems();
    if (menuItems) {
        res.status(200).json(menuItems);
    } else {
        res.status(404).json({ "message": "No menu items" });
    }
}

async function getMenuItem(req, res) {
    const { id } = req.params;
    const menuItem = await MenuData.getMenuItem(id);
    if (menuItem) {
        res.status(200).json(menuItem);
    } else {
        res.status(404).json({ "message": " No item found" });
    }
}

async function addMenuItem(req, res) {
    const { name, price, description, category } = req.body;
    // Validate that name, price and description are present
    if (!name || !price || !description || !category) {
        return res.status(400).json({
            "message": 'Name, price, and description are required for adding a new menu item',
        });
    }
    const newItem = { name, price, description, category };

    const addItem = await MenuData.addMenuItem(newItem);

    if (addItem) {
        res.status(200).json({ "message": "Added menu item" });
    } else {
        res.status(404).json({ "message": "Item not added" });
    }
}

async function updateMenuItem(req, res) {
    const { id } = req.params;
    const newData = req.body;
    const update = await MenuData.updateMenu(id, newData);
    if (update) {
        res.status(200).json({ "message": "Menu item updated" });
    } else {
        res.status(404).json({ "message": "Menu item was not updated" });
    }
}

async function removeMenuItem(req, res) {
    const { id } = req.params;
    const removed = await MenuData.removeMenuItem(id);
    if (removed) {
        res.status(200).json({ "message": "Menu item removed" });
    } else {
        res.status(404).json({ "message": "Menu item not found" });
    }
}

// CRUD operations for menu options

async function getAllMenuOption(req, res) {
    const menuItems = await MenuOptionsData.getAllMenuOption();
    if (menuItems) {
        res.status(200).json(menuItems);
    } else {
        res.status(404).json({ "message": "No menu options found" });
    }
}

async function getMenuOption(req, res) {
    const { id } = req.params;
    const menuOption = await MenuOptionsData.getMenuOption(id);
    if (menuOption) {
        res.status(200).json(menuOption);
    } else {
        res.status(404).json({ "message": "No menu option found" });
    }
}

async function addMenuOption(req, res) {
    const { name, description, choices, menu_id } = req.body;
    // Validate that name, price and description are present
    if (!name || !description || !choices || !menu_id) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Name, description, and choices are required for adding a new menu option',
        });
    }

    const newItem = { name, description, choices, menu_id };

    const addItem = await MenuOptionsData.addMenuOption(newItem);

    if (addItem) {
        res.status(200).json({ "message": "Added menu option" });
    } else {
        res.status(404).json({ "message": "Item not added" });
    }
}

async function updateMenuOption(req, res) {
    const { id } = req.params;
    const newData = req.body;
    const update = await MenuOptionsData.updateMenuOption(id, newData);
    if (update) {
        res.status(200).json({ "message": "Option updated" });
    } else {
        res.status(404).json({ "message": "Item was not updated" });
    }
}

async function removeMenuOption(req, res) {
    const { id } = req.params;
    const removed = await MenuOptionsData.removeMenuOption(id);
    if (removed) {
        res.status(200).json({ "message": "Menu option removed" });
    } else {
        res.status(404).json({ "message": "Menu option not found" });
    }
}

// Associations between menu and menu_option

const addAssociation = async (req, res) => {
    try {
        const { menuItemId, optionId } = req.params;

        // Check if the menu item and option exist
        const menuItemExists = await MenuData.checkMenuItemExists(menuItemId);
        const optionExists = await MenuOptionsData.checkOptionExists(optionId);

        if (!menuItemExists || !optionExists) {
            return res.status(404).json({ message: 'Menu item or option not found' });
        }

        // Add the association
        const query = 'INSERT INTO menu (menu_item_id, option_id) VALUES (?, ?)';
        await db.query(query, [menuItemId, optionId]);

        res.status(200).json({ message: 'Association added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding association', error: error.message });
    }
};

const removeAssociation = async (req, res) => {
    try {
        const { menuItemId, optionId } = req.params;

        // Check if the menu item and option exist
        const associationExists = await MenuData.checkAssociationExists(menuItemId, optionId);

        if (!associationExists) {
            return res.status(404).json({ message: 'Association not found' });
        }

        // Remove the association
        const query = 'DELETE FROM menu WHERE menu_item_id = ? AND option_id = ?';
        await db.query(query, [menuItemId, optionId]);

        res.status(200).json({ message: 'Association removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing association', error: error.message });
    }
};

module.exports = {
    getAllMenuItems,
    getMenuItem,
    addMenuItem,
    updateMenuItem,
    removeMenuItem,
    getAllMenuOption,
    getMenuOption,
    addMenuOption,
    updateMenuOption,
    removeMenuOption,
    addAssociation,
    removeAssociation,
}