// API Configuration
export const API_CONFIG = {
    // Backend base URL
    BACKEND_BASE_URL: 'https://sistemaconsumos.serviciosasturias.com',

    // Caja Diaria base URL (para sincronización futura)
    CAJA_DIARIA_BASE_URL: 'https://cajadiaria.serviciosasturias.com',

    // API Key para sincronización con caja diaria
    CAJA_DIARIA_API_KEY: 'CAMBIAR_ESTA_API_KEY', // TODO: Actualizar con la clave real
};

// Endpoints del backend
export const ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: '/login.php',
    },

    // Users (Admin only)
    USERS: {
        LIST: '/list_users.php',
        CREATE: '/create_user.php',
        UPDATE: '/update_user.php',
        DELETE: '/delete_user.php',
    },

    // Stock/Products
    STOCK: {
        LIST: '/list_stock_items.php',
        CREATE: '/create_stock_item.php',
        UPDATE: '/update_stock_item.php',
        DELETE: '/delete_stock_item.php',
    },

    // Gastos
    GASTOS: {
        LIST: '/list_gastos.php',
        CREATE: '/create_gasto.php',
        DELETE: '/delete_gasto.php',
    },

    // Consumos
    CONSUMOS: {
        LIST: '/list_consumos.php',
        CREATE: '/create_consumo.php',
    },

    // Consumo Pagos
    CONSUMO_PAGOS: {
        LIST: '/list_consumo_pagos.php',
        CREATE: '/create_consumo_pago.php',
    },

    // Tickets
    TICKETS: {
        LIST: '/list_tickets.php',
        CREATE: '/create_ticket.php',
        CLOSE: '/close_ticket.php',
        ADD_ITEM: '/add_ticket_item.php',
        LIST_ITEMS: '/list_ticket_items.php',
    },

    // Movimientos de Caja (ahora en el backend principal)
    MOVIMIENTOS: {
        GET_MOVEMENTS: '/get_area_movements.php',
        SAVE_MOVEMENT: '/save_area_movement.php',
        DELETE_MOVEMENT: '/delete_area_movement.php',
    },
};
