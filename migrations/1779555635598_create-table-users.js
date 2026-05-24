exports.up = (pgm) => {
    pgm.createTable('users', {
        id: { type: 'VARCHAR(36)', primaryKey: true },
        name: { type: 'VARCHAR(255)', notNull: true },
        email: { type: 'VARCHAR(255)', notNull: true, unique: true },
        password: { type: 'VARCHAR(255)', notNull: true },
        role: { type: 'VARCHAR(50)', notNull: true, default: 'user' },
        created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
        updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    });
};

exports.down = (pgm) => {
    pgm.dropTable('users');
};